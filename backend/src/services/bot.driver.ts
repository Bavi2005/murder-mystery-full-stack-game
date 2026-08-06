import { Server, Socket } from 'socket.io';
import { CluedoEngine, EngineResult } from './game.service';
import { prisma } from '../config/prisma';
import { NODE_MAP, ROOM_IDS, SUSPECTS, WEAPONS, distance } from '../game/board';
import { eventLabel } from '../game/eventLabel';

const BOT_ACTION_DELAY_MS = 1700;
const activeGames = new Map<string, Set<Socket>>();
const botLocks = new Map<string, boolean>();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const registerGameSocket = (gameKey: string, socket: Socket) => {
  if (!activeGames.has(gameKey)) activeGames.set(gameKey, new Set());
  activeGames.get(gameKey)!.add(socket);
};

export const unregisterGameSocket = (gameKey: string, socket: Socket) => {
  activeGames.get(gameKey)?.delete(socket);
  if (activeGames.get(gameKey)?.size === 0) activeGames.delete(gameKey);
};

async function broadcastGameResult(io: Server, gameId: string, result: EngineResult) {
  const sockets = [...(activeGames.get(`game:${gameId}`) || [])];
  for (const event of result.events) {
    const label = eventLabel(event.type, event.data);
    io.to(`game:${gameId}`).emit('game:event', {
      type: event.type,
      playerId: event.playerId,
      label: label || '',
      data: event.data,
    });
  }
  if (result.privateTo) {
    io.to(`player:${result.privateTo.playerId}`).emit(`game:${result.privateTo.event.toLowerCase()}`, result.privateTo.data);
  }
  for (const target of sockets) {
    const userId = (target as { userId?: string }).userId;
    if (!userId) continue;
    void CluedoEngine.getGameState(gameId, userId)
      .then(state => target.emit('game:state', state))
      .catch(() => {});
  }
}

async function actAndBroadcast(
  io: Server,
  gameId: string,
  playerId: string,
  action: 'roll' | 'move' | 'passage' | 'suggest' | 'reveal' | 'accuse' | 'endTurn',
  payload: Record<string, unknown> = {}
) {
  const result = await CluedoEngine.act(gameId, playerId, action, payload);
  await broadcastGameResult(io, gameId, result);
  return result;
}

interface TurnSnapshot {
  meId: string;
  isAlive: boolean;
  dice: [number, number] | null;
  stepsRemaining: number;
  position: string;
  characterId: string;
  hand: string[];
  phase: string;
  players: Array<{ id: string; isAlive: boolean; position: string }>;
  awaitingPlayerId: string | null;
  awaitingCards: string[];
}

async function snapshot(gameId: string): Promise<TurnSnapshot | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { include: { user: { select: { isBot: true } } } } },
  });
  if (!game || game.status !== 'IN_PROGRESS') return null;

  const state = game.state as unknown as Record<string, unknown>;
  const turnOrder = (state.turnOrder as string[]) || [];
  const turnIndex = (state.turnIndex as number) || 0;
  const meId = turnOrder[turnIndex] ?? '';
  const me = game.players.find(p => p.id === meId);
  if (!me?.user?.isBot) return null;

  const ps = state.pendingSuggestion as unknown as { awaitingPlayerId: string | null; awaitingCards: string[] } | null;

  return {
    meId: me.id,
    isAlive: me.isAlive,
    dice: (state.dice as [number, number] | null) ?? null,
    stepsRemaining: (state.stepsRemaining as number) || 0,
    position: me.position,
    characterId: me.characterId,
    hand: Array.isArray(me.hand) ? (me.hand as string[]) : [],
    phase: state.phase as string,
    players: game.players.map(p => ({ id: p.id, isAlive: p.isAlive, position: p.position })),
    awaitingPlayerId: ps?.awaitingPlayerId ?? null,
    awaitingCards: ps?.awaitingCards ?? [],
  };
}

function pickTarget(s: TurnSnapshot, from: string): string | null {
  const steps = s.stepsRemaining;
  const rooms = s.players
    .filter(p => p.id !== s.meId && p.isAlive && ROOM_IDS.includes(p.position))
    .map(p => p.position);
  const roomCandidates = rooms.filter(roomId => {
    const d = distance(from, roomId);
    return d !== null && d > 0 && d <= steps;
  });
  if (roomCandidates.length > 0) {
    const target = roomCandidates[Math.floor(Math.random() * roomCandidates.length)];
    if (target) return target;
  }

  const corridorOptions = Object.values(NODE_MAP)
    .filter(n => n.kind === 'corridor' && n.id !== from)
    .map(n => n.id)
    .filter(id => {
      const d = distance(from, id);
      return d !== null && d > 0 && d <= steps;
    });
  if (corridorOptions.length === 0) return null;
  const node = corridorOptions[Math.floor(Math.random() * corridorOptions.length)];
  return node || null;
}

function suggestPicks(s: TurnSnapshot): { suspectId: string; weaponId: string } {
  const known = new Set(s.hand);
  const suspects = shuffle(SUSPECTS.filter(x => !known.has(x.id)));
  const weapons = shuffle(WEAPONS.filter(w => !known.has(w)));
  const suspectId = suspects.length > 0 ? suspects[0]!.id : SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)]!.id;
  const weaponId = weapons.length > 0 ? weapons[0]! : WEAPONS[Math.floor(Math.random() * WEAPONS.length)]!;
  return { suspectId, weaponId };
}

export const driveBotTurns = async (io: Server, gameId: string): Promise<void> => {
  if (botLocks.get(gameId)) return;
  botLocks.set(gameId, true);
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const s = await snapshot(gameId);
      if (!s) {
        // persist() is fire-and-forget in the engine: retry briefly to ride
        // out the write race before giving up on this trigger.
        if (attempt < 4) {
          await sleep(250);
          continue;
        }
        return;
      }
      if (s.phase !== 'playing') return;

      for (let guard = 0; guard < 12; guard++) {
        if (s.awaitingPlayerId) {
          if (s.awaitingPlayerId === s.meId && s.awaitingCards.length > 0) {
            const cardId = s.awaitingCards[Math.floor(Math.random() * s.awaitingCards.length)]!;
            await actAndBroadcast(io, gameId, s.meId, 'reveal', { cardId });
            await sleep(BOT_ACTION_DELAY_MS);
          }
          return;
        }

        if (!s.isAlive) {
          await actAndBroadcast(io, gameId, s.meId, 'endTurn');
          return;
        }

        if (s.dice === null) {
          await actAndBroadcast(io, gameId, s.meId, 'roll');
          await sleep(BOT_ACTION_DELAY_MS);
          void driveBotTurns(io, gameId);
          return;
        }

        if (s.stepsRemaining > 0) {
          const target = pickTarget(s, s.position);
          if (target) {
            await actAndBroadcast(io, gameId, s.meId, 'move', { to: target });
            await sleep(BOT_ACTION_DELAY_MS);
            void driveBotTurns(io, gameId);
            return;
          }
          break;
        }

        if (ROOM_IDS.includes(s.position)) {
          const { suspectId, weaponId } = suggestPicks(s);
          await actAndBroadcast(io, gameId, s.meId, 'suggest', { suspectId, weaponId });
          await sleep(BOT_ACTION_DELAY_MS);
        }
        break;
      }

      await actAndBroadcast(io, gameId, s.meId, 'endTurn');
      await sleep(BOT_ACTION_DELAY_MS);
      void driveBotTurns(io, gameId);
      return;
    }
  } finally {
    botLocks.delete(gameId);
  }
};