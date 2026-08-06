import { MessageType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { encryptEnvelope, decryptEnvelope } from '../utils/crypto';
import { Game, GamePlayer } from '@prisma/client';
import {
  ALL_CARDS,
  ROOMS,
  ROOM_IDS,
  SUSPECTS,
  WEAPONS,
  START_SQUARES,
  NODE_MAP,
  distance,
} from '../game/board';

type GameWithPlayers = Game & { players: (GamePlayer & { user?: { id: string; isBot?: boolean } })[] };

// ---------------------------------------------------------------------------
// Server-authoritative Cluedo engine.
//
// All gameplay rules live here. The socket layer is a thin transport: every
// payload is re-validated against server state, and private information
// (hands, the secret envelope) is never serialized to the wrong client.
// ---------------------------------------------------------------------------

export interface GamePhaseState {
  phase: 'waiting' | 'playing' | 'finished';
  turnOrder: string[];          // GamePlayer ids, in seat order
  turnIndex: number;            // index of current player
  dice: [number, number] | null;
  stepsRemaining: number;
  moved: boolean;               // has the current player used movement yet
  suggestedThisTurn: boolean;
  accusedThisTurn: boolean;
  pendingSuggestion: PendingSuggestion | null;
  winnerId: string | null;
  envelopeRevealed: boolean;
}

export interface PendingSuggestion {
  suggesterPlayerId: string;
  suspectId: string;
  weaponId: string;
  roomId: string;
  // players to ask, in order, starting from the next seat
  scanOrder: string[];
  scanIndex: number;
  awaitingPlayerId: string | null;   // player currently asked to reveal
  awaitingCards: string[];           // card ids that player may reveal
  revealedBy: string | null;
  revealedCardId: string | null;     // only ever sent to the suggester
  disproved: boolean;
}

export interface Envelope {
  suspectId: string;
  weaponId: string;
  roomId: string;
}

export interface EngineEvent {
  type: 'ROLL' | 'MOVE' | 'PASSAGE' | 'SUGGEST' | 'DISPROVE' | 'NO_DISPROVE' | 'ACCUSE' | 'ELIMINATE' | 'WIN' | 'END_TURN' | 'SYSTEM';
  playerId?: string | null;
  data: Record<string, unknown>;
}

export interface EngineResult {
  events: EngineEvent[];
  privateTo?: { playerId: string; event: 'REVEAL_REQUEST' | 'REVEALED_CARD'; data: Record<string, unknown> };
  gameOver?: boolean;
}

const PASSAGES: Record<string, string> = {
  kitchen: 'study',
  study: 'kitchen',
  lounge: 'conservatory',
  conservatory: 'lounge',
};

export class CluedoEngine {
  // ---- lobby / REST -------------------------------------------------------

  static async createRoom(hostId: string, data: { name: string; maxPlayers: number; settings?: Record<string, unknown> }) {
    const botCount = Math.min(Math.max(Number((data.settings || {}).botCount) || 0, 0), data.maxPlayers - 1);
    const room = await prisma.game.create({
      data: {
        name: data.name.trim(),
        hostId,
        maxPlayers: data.maxPlayers,
        status: 'WAITING',
        settings: { ...(data.settings || {}), botCount } as Prisma.InputJsonValue,
        state: { phase: 'waiting', turnOrder: [], turnIndex: 0, dice: null, stepsRemaining: 0, moved: false, suggestedThisTurn: false, accusedThisTurn: false, pendingSuggestion: null, winnerId: null, envelopeRevealed: false },
      },
    });
    await prisma.gamePlayer.create({
      data: { gameId: room.id, userId: hostId, characterId: '', position: '' },
    });

    if (botCount > 0) {
      const bots = await this.ensureBotUsers(botCount);
      await prisma.gamePlayer.createMany({
        data: bots.map(bot => ({ gameId: room.id, userId: bot.id, characterId: '', position: '' })),
      });
      logger.info('Bot players added to room', { roomId: room.id, botCount });
    }

    logger.info('Room created', { roomId: room.id, hostId });
    return room;
  }

  static async ensureBotUsers(count: number) {
    const existing = await prisma.user.findMany({ where: { isBot: true } });
    const names = ['Sherlock', 'Watson', 'Poirot', 'Miss Marple', 'Holmes', 'Columbo'];
    const missing = count - existing.length;
    if (missing > 0) {
      const created = await Promise.all(Array.from({ length: missing }, (_, i) =>
        prisma.user.create({
          data: {
            email: `bot${Date.now()}${i}@mansion.ai`,
            username: `bot_${names[(existing.length + i) % names.length].toLowerCase()}_${i}`,
            displayName: `${names[(existing.length + i) % names.length]} (Bot)`,
            passwordHash: `bot-${Math.random().toString(36).slice(2)}`,
            isBot: true,
          },
        })
      ));
      existing.push(...created);
    }
    return existing.slice(0, count);
  }

  static async listRooms(filters: { page: number; limit: number; status?: string }) {
    const where: Prisma.GameWhereInput = {};
    if (filters.status) where.status = filters.status as Prisma.GameWhereInput['status'];
    const skip = (filters.page - 1) * filters.limit;
    const [rooms, total] = await Promise.all([
      prisma.game.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          players: { select: { id: true, userId: true, isAlive: true } },
        },
      }),
      prisma.game.count({ where }),
    ]);
    return {
      rooms: rooms.map(r => ({
        ...r,
        currentPlayers: r.players.length,
        players: undefined,
      })),
      meta: { page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) },
    };
  }

  static async getPublicRoom(roomId: string) {
    const room = await prisma.game.findUnique({
      where: { id: roomId },
      include: {
        host: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
        players: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, isBot: true } } } },
      },
    });
    if (!room) throw new NotFoundError('Room not found');

    // Redact secret fields so rooms can never expose hands or internal state.
    const { state: _state, envelope: _envelope, ...safe } = room;
    return {
      ...safe,
      players: room.players.map(p => ({
        id: p.id,
        gameId: p.gameId,
        userId: p.userId,
        characterId: p.characterId,
        position: p.position,
        isAlive: p.isAlive,
        disconnected: p.disconnected,
        score: p.score,
        joinedAt: p.joinedAt,
        user: p.user,
      })),
    };
  }

  static async getRoom(roomId: string) {
    // Backwards-compatible alias. NEVER include `hand` in room payloads.
    return this.getPublicRoom(roomId);
  }

  static async getPrivateRoom(roomId: string, viewerUserId: string) {
    const room = await this.getPublicRoom(roomId);
    const viewer = room.players.find(p => p.userId === viewerUserId);
    if (!viewer) throw new NotFoundError('Not a member of this room');
    const db = await prisma.gamePlayer.findUnique({ where: { id: viewer.id } });
    return {
      ...room,
      myPlayerId: viewer.id,
      myCharacterId: db?.characterId ?? null,
      myHand: Array.isArray(db?.hand) ? (db.hand as string[]) : [],
    };
  }

  static async joinRoom(roomId: string, userId: string) {
    const room = await prisma.game.findUnique({ where: { id: roomId }, include: { players: true } });
    if (!room) throw new NotFoundError('Room not found');
    if (room.status !== 'WAITING') throw new ValidationError('Game already started');
    if (room.players.length >= room.maxPlayers) throw new ValidationError('Room is full');
    if (room.players.some(p => p.userId === userId)) throw new ValidationError('Already in room');

    await prisma.gamePlayer.create({ data: { gameId: roomId, userId, characterId: '', position: '' } });
    return this.getRoom(roomId);
  }

  static async leaveRoom(roomId: string, userId: string) {
    const player = await prisma.gamePlayer.findFirst({ where: { gameId: roomId, userId } });
    if (!player) throw new NotFoundError('Not in this room');

    const room = await prisma.game.findUnique({ where: { id: roomId }, include: { players: { include: { user: { select: { id: true, isBot: true } } } } } });

    if (room && room.status === 'WAITING') {
      await prisma.gamePlayer.delete({ where: { id: player.id } });
      if (room.players.length <= 1) {
        await prisma.game.delete({ where: { id: roomId } });
      } else if (room.hostId === userId) {
        const next = room.players.find(p => p.userId !== userId && !p.user?.isBot);
        if (!next) {
          await prisma.game.delete({ where: { id: roomId } });
        } else {
          await prisma.game.update({ where: { id: roomId }, data: { hostId: next.userId } });
        }
      }
      return { success: true };
    }

    // Mid-game leave: mark as disconnected, keep the token on the board.
    if (room && room.status === 'IN_PROGRESS') {
      await prisma.gamePlayer.update({ where: { id: player.id }, data: { disconnected: true, leftAt: new Date() } });
      return { success: true, disconnected: true };
    }

    throw new ValidationError('Cannot leave a finished game');
  }

  static async updateRoom(hostId: string, data: { roomId: string; name?: string; settings?: Record<string, unknown> }) {
    const room = await prisma.game.findUnique({ where: { id: data.roomId } });
    if (!room) throw new NotFoundError('Room not found');
    if (room.hostId !== hostId) throw new ValidationError('Only the host can update the room');
    if (room.status !== 'WAITING') throw new ValidationError('Cannot update a running game');

    const patch: Prisma.GameUpdateInput = {};
    if (data.name) patch.name = data.name.trim();
    if (data.settings) patch.settings = data.settings as Prisma.InputJsonValue;
    if (data.settings?.maxPlayers) patch.maxPlayers = Number(data.settings.maxPlayers);

    await prisma.game.update({ where: { id: data.roomId }, data: patch });
    return this.getRoom(data.roomId);
  }

  static async sendChat(gameId: string, senderUserId: string, data: { content: string; type?: string; receiverId?: string }) {
    const member = await prisma.gamePlayer.findFirst({ where: { gameId, userId: senderUserId } });
    if (!member) throw new ValidationError('You are not in this game');

    const content = data.content.trim().slice(0, 500);
    if (!content) throw new ValidationError('Message cannot be empty');

    return prisma.chatMessage.create({
      data: {
        gameId,
        senderId: senderUserId,
        receiverId: data.receiverId || null,
        content,
        type: data.receiverId ? 'PRIVATE' : (data.type as MessageType) || 'CHAT',
      },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }

  static async getChatHistory(gameId: string, userId: string, limit = 50) {
    const member = await prisma.gamePlayer.findFirst({ where: { gameId, userId } });
    if (!member) throw new ValidationError('You are not in this game');

    return prisma.chatMessage.findMany({
      where: {
        gameId,
        OR: [{ receiverId: null }, { receiverId: userId }, { senderId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }

  // ---- setup --------------------------------------------------------------

  static async startGame(roomId: string, hostId: string) {
    const room = await prisma.game.findUnique({ where: { id: roomId }, include: { players: { include: { user: { select: { id: true, isBot: true } } } } } });
    if (!room) throw new NotFoundError('Room not found');
    if (room.hostId !== hostId) throw new ValidationError('Only the host can start the game');
    if (room.status !== 'WAITING') throw new ValidationError('Game already started');
    if (room.players.length < 3 && room.players.some(p => p.user.isBot === false)) throw new ValidationError('Need at least 3 players');

    const players = [...room.players].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    // 1. Pick the secret envelope: 1 suspect + 1 weapon + 1 room.
    const envelope: Envelope = {
      suspectId: SUSPECTS[Math.floor(Math.random() * SUSPECTS.length)].id,
      weaponId: WEAPONS[Math.floor(Math.random() * WEAPONS.length)],
      roomId: ROOMS[Math.floor(Math.random() * ROOMS.length)].id,
    };
    const encryptedEnvelope = encryptEnvelope(envelope);

    // 2. Deal the remaining cards round-robin.
    const deck = ALL_CARDS.filter(k => k !== envelope.suspectId && k !== envelope.weaponId && k !== envelope.roomId);
    this.shuffle(deck);
    const hands: string[][] = players.map(() => []);
    deck.forEach((card, i) => hands[i % players.length].push(card));

    // 3. Assign suspect tokens + starting squares.
    const shuffledSuspects = [...SUSPECTS].sort(() => Math.random() - 0.5);
    const shuffledStarts = [...START_SQUARES].sort(() => Math.random() - 0.5);

    const state: GamePhaseState = {
      phase: 'playing',
      turnOrder: players.map(p => p.id),
      turnIndex: 0,
      dice: null,
      stepsRemaining: 0,
      moved: false,
      suggestedThisTurn: false,
      accusedThisTurn: false,
      pendingSuggestion: null,
      winnerId: null,
      envelopeRevealed: false,
    };

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < players.length; i++) {
        const suspect = shuffledSuspects[i % shuffledSuspects.length];
        const start = shuffledStarts[i % shuffledStarts.length];
        await tx.gamePlayer.update({
          where: { id: players[i].id },
          data: {
            characterId: suspect.id,
            position: start.id,
            hand: hands[i],
            isAlive: true,
            disconnected: false,
            score: 0,
          },
        });
      }
      await tx.game.update({
        where: { id: roomId },
        data: { status: 'IN_PROGRESS', envelope: encryptedEnvelope, state: state as unknown as Prisma.InputJsonValue, startedAt: new Date() },
      });
      await tx.gameEvent.create({
        data: {
          gameId: roomId,
          type: 'SYSTEM',
          data: { message: 'The game begins. The mansion is sealed. Someone in the house is the murderer.' },
        },
      });
    });

    logger.info('Game started', { roomId });
    return this.getRoom(roomId);
  }

  // ---- gameplay (all mutating actions go through this) --------------------

  static async act(
    gameId: string,
    playerId: string, // GamePlayer.id
    action: 'roll' | 'move' | 'passage' | 'suggest' | 'reveal' | 'accuse' | 'endTurn',
    payload: Record<string, unknown>,
  ): Promise<EngineResult> {
    const game = await prisma.game.findUnique({ where: { id: gameId }, include: { players: true } });
    if (!game) throw new NotFoundError('Game not found');
    if (game.status !== 'IN_PROGRESS') throw new ValidationError('Game is not in progress');

    const me = game.players.find(p => p.id === playerId);
    if (!me) throw new NotFoundError('You are not in this game');
    if (!me.isAlive) throw new ValidationError('You have been eliminated');

    const state = (game.state || {}) as unknown as GamePhaseState;

    switch (action) {
      case 'roll': return this.roll(game, state, me);
      case 'move': return this.move(game, state, me, payload);
      case 'passage': return this.passage(game, state, me);
      case 'suggest': return this.suggest(game, state, me, payload);
      case 'reveal': return this.reveal(game, state, me, payload);
      case 'accuse': return this.accuse(game, state, me, payload);
      case 'endTurn': return this.endTurn(game, state, me);
      default: throw new ValidationError('Unknown action');
    }
  }

  private static async roll(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer): Promise<EngineResult> {
    this.assertCurrentTurn(game, state, me);
    if (state.dice !== null) throw new ValidationError('You already rolled this turn');
    if (state.pendingSuggestion) throw new ValidationError('A suggestion is being resolved');

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    state.dice = [d1, d2];
    state.stepsRemaining = sum;
    state.moved = false;
    state.suggestedThisTurn = false;
    state.accusedThisTurn = false;
    state.pendingSuggestion = null;

    await this.persist(game, state);
    return { events: [{ type: 'ROLL', playerId: me.id, data: { d1, d2, total: sum } }] };
  }

  private static async move(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer, payload: Record<string, unknown>): Promise<EngineResult> {
    this.assertCurrentTurn(game, state, me);
    if (state.dice === null) throw new ValidationError('Roll the dice first');
    if (state.stepsRemaining <= 0) throw new ValidationError('No steps remaining');
    if (state.pendingSuggestion) throw new ValidationError('A suggestion is being resolved');

    const target = String(payload?.to || '');
    if (!NODE_MAP[target]) throw new ValidationError('Unknown destination');

    // Occupied corridor squares block movement (rooms are shared).
    const occupants = game.players.filter(p => p.isAlive && p.position === target && p.id !== me.id);
    if (occupants.length > 0 && !ROOM_IDS.includes(target)) throw new ValidationError('That square is occupied');

    const dist = distance(me.position || '', target);
    if (dist === null || dist <= 0 || dist > state.stepsRemaining) {
      throw new ValidationError(`You cannot reach that square (${dist === null ? 'no path' : `${dist} steps needed`})`);
    }

    const prev = me.position;
    me.position = target;
    state.stepsRemaining -= dist;
    state.moved = true;

    // Entering a room ends the move.
    if (ROOM_IDS.includes(target)) state.stepsRemaining = 0;

    await this.persist(game, state);
    return { events: [{ type: 'MOVE', playerId: me.id, data: { from: prev, to: target, stepsLeft: state.stepsRemaining } }] };
  }

  private static async passage(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer): Promise<EngineResult> {
    this.assertCurrentTurn(game, state, me);
    if (state.dice === null) throw new ValidationError('Roll the dice first');
    const dest = PASSAGES[me.position || ''];
    if (!dest) throw new ValidationError('No secret passage here');
    if (state.pendingSuggestion) throw new ValidationError('A suggestion is being resolved');

    const prev = me.position;
    me.position = dest;
    state.stepsRemaining = 0;
    state.moved = true;

    await this.persist(game, state);
    return { events: [{ type: 'PASSAGE', playerId: me.id, data: { from: prev, to: dest } }] };
  }

  private static async suggest(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer, payload: Record<string, unknown>): Promise<EngineResult> {
    this.assertCurrentTurn(game, state, me);
    if (state.dice === null) throw new ValidationError('Roll the dice first');
    if (state.suggestedThisTurn) throw new ValidationError('You already made a suggestion this turn');
    if (state.pendingSuggestion) throw new ValidationError('A suggestion is being resolved');
    if (!ROOM_IDS.includes(me.position || '')) throw new ValidationError('You can only suggest from inside a room');

    const suspectId = String(payload?.suspectId || '');
    const weaponId = String(payload?.weaponId || '');
    const roomId = me.position;
    if (!SUSPECTS.some(s => s.id === suspectId)) throw new ValidationError('Unknown suspect');
    if (!WEAPONS.includes(weaponId)) throw new ValidationError('Unknown weapon');

    state.suggestedThisTurn = true;

    // Who gets asked? Every other player in seat order, starting from the next seat.
    const idx = state.turnOrder.indexOf(me.id);
    const scanOrder = [...state.turnOrder.slice(idx + 1), ...state.turnOrder.slice(0, idx)]
      .filter(id => id !== me.id);
    const aliveScan = scanOrder.filter(id => game.players.find(p => p.id === id)?.isAlive);

    state.pendingSuggestion = {
      suggesterPlayerId: me.id,
      suspectId,
      weaponId,
      roomId,
      scanOrder: aliveScan,
      scanIndex: 0,
      awaitingPlayerId: null,
      awaitingCards: [],
      revealedBy: null,
      revealedCardId: null,
      disproved: false,
    };

    // Immediately advance the disproof loop; persist happens there.
    const result = this.advanceSuggestion(game, state);
    result.events = [{ type: 'SUGGEST', playerId: me.id, data: { suspectId, weaponId, roomId } }, ...result.events];
    await this.persist(game, state);
    return result;
  }

  private static advanceSuggestion(game: GameWithPlayers, state: GamePhaseState): EngineResult {
    const s = state.pendingSuggestion!;
    while (s.scanIndex < s.scanOrder.length) {
      const candidateId = s.scanOrder[s.scanIndex];
      const candidate = game.players.find(p => p.id === candidateId);
      if (!candidate || !candidate.isAlive) { s.scanIndex++; continue; }

      const hand: string[] = Array.isArray(candidate.hand) ? (candidate.hand as string[]) : [];
      const matches = hand.filter(card => card === s.suspectId || card === s.weaponId || card === s.roomId);
      if (matches.length > 0) {
        s.awaitingPlayerId = candidate.id;
        s.awaitingCards = matches;
        return {
          events: [],
          privateTo: { playerId: candidate.id, event: 'REVEAL_REQUEST', data: { cards: matches } },
        };
      }
      s.scanIndex++;
    }
    // Nobody could disprove.
    state.pendingSuggestion = null;
    return { events: [{ type: 'NO_DISPROVE', playerId: s.suggesterPlayerId, data: { suspectId: s.suspectId, weaponId: s.weaponId, roomId: s.roomId } }] };
  }

  private static async reveal(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer, payload: Record<string, unknown>): Promise<EngineResult> {
    const s = state.pendingSuggestion;
    if (!s) throw new ValidationError('No suggestion awaiting a reveal');
    if (s.awaitingPlayerId !== me.id) throw new ValidationError('It is not your turn to reveal');

    const cardId = String(payload?.cardId || '');
    if (!s.awaitingCards.includes(cardId)) throw new ValidationError('You cannot reveal that card');
    const hand: string[] = Array.isArray(me.hand) ? (me.hand as string[]) : [];
    if (!hand.includes(cardId)) throw new ValidationError('You do not hold that card');

    s.revealedBy = me.id;
    s.revealedCardId = cardId;
    s.disproved = true;
    state.pendingSuggestion = null;

    await this.persist(game, state);
    return {
      events: [{ type: 'DISPROVE', playerId: me.id, data: { suspectId: s.suspectId, weaponId: s.weaponId, roomId: s.roomId } }],
      privateTo: { playerId: s.suggesterPlayerId, event: 'REVEALED_CARD', data: { cardId } },
    };
  }

  private static async accuse(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer, payload: Record<string, unknown>): Promise<EngineResult> {
    this.assertCurrentTurn(game, state, me);
    if (state.dice === null) throw new ValidationError('Roll the dice first');
    if (state.accusedThisTurn) throw new ValidationError('You already accused this turn');
    if (state.pendingSuggestion) throw new ValidationError('A suggestion is being resolved');

    const suspectId = String(payload?.suspectId || '');
    const weaponId = String(payload?.weaponId || '');
    const roomId = String(payload?.roomId || '');
    if (!SUSPECTS.some(s => s.id === suspectId)) throw new ValidationError('Unknown suspect');
    if (!WEAPONS.includes(weaponId)) throw new ValidationError('Unknown weapon');
    if (!ROOMS.some(r => r.id === roomId)) throw new ValidationError('Unknown room');

    state.accusedThisTurn = true;

    const envelope = decryptEnvelope<Envelope>(game.envelope || '');
    const correct = suspectId === envelope.suspectId && weaponId === envelope.weaponId && roomId === envelope.roomId;

    if (correct) {
      state.phase = 'finished';
      state.winnerId = me.id;
      state.envelopeRevealed = true;
      state.dice = null;
      me.score = 100;
      await this.finishGame(game, state, me.id);
      return {
        gameOver: true,
        events: [
          { type: 'ACCUSE', playerId: me.id, data: { suspectId, weaponId, roomId, correct: true } },
          { type: 'WIN', playerId: me.id, data: { envelope: { suspectId, weaponId, roomId } } },
        ],
      };
    }

    // Wrong accusation: eliminated, game continues.
    me.isAlive = false;
    state.dice = null;

    const alive = game.players.filter(p => p.isAlive);
    const result: EngineResult = {
      gameOver: false,
      events: [
        { type: 'ACCUSE', playerId: me.id, data: { suspectId, weaponId, roomId, correct: false } },
        { type: 'ELIMINATE', playerId: me.id, data: { reason: 'wrong_accusation' } },
      ],
    };

    if (alive.length === 1) {
      const winner = alive[0];
      winner.score = 100;
      state.phase = 'finished';
      state.winnerId = winner.id;
      state.envelopeRevealed = true;
      state.turnIndex = state.turnOrder.indexOf(winner.id);
      result.gameOver = true;
      result.events.push({ type: 'WIN', playerId: winner.id, data: { envelope: { suspectId: envelope.suspectId, weaponId: envelope.weaponId, roomId: envelope.roomId } } });
      await this.finishGame(game, state, winner.id);
    } else {
      // Skip to the next alive player after the eliminated one.
      this.advanceTurnIndex(state, game);
    }

    await this.persist(game, state);
    return result;
  }

  private static async endTurn(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer): Promise<EngineResult> {
    this.assertCurrentTurn(game, state, me);
    if (state.pendingSuggestion) throw new ValidationError('A suggestion is being resolved');

    this.advanceTurnIndex(state, game);
    state.dice = null;
    state.stepsRemaining = 0;
    state.moved = false;
    state.suggestedThisTurn = false;
    state.accusedThisTurn = false;

    await this.persist(game, state);
    return { events: [{ type: 'END_TURN', playerId: me.id, data: { nextPlayerId: state.turnOrder[state.turnIndex] } }] };
  }

  // ---- helpers ------------------------------------------------------------

  private static assertCurrentTurn(game: GameWithPlayers, state: GamePhaseState, me: GamePlayer) {
    const currentPlayerId = state.turnOrder[state.turnIndex];
    if (currentPlayerId !== me.id) {
      const current = game.players.find(p => p.id === currentPlayerId);
      throw new ValidationError(`It is ${(current as unknown as { user?: { username?: string } })?.user?.username || 'another player'}'s turn`);
    }
  }

  private static advanceTurnIndex(state: GamePhaseState, game: GameWithPlayers) {
    for (let i = 0; i < state.turnOrder.length; i++) {
      state.turnIndex = (state.turnIndex + 1) % state.turnOrder.length;
      const p = game.players.find(pl => pl.id === state.turnOrder[state.turnIndex]);
      if (p && p.isAlive) return;
    }
  }

  private static shuffle<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  private static async persist(game: GameWithPlayers, state: GamePhaseState) {
    // Persist BOTH the serialized game state AND every player mutation
    // (position, elimination, score) in one transaction. Without the player
    // updates, moves/eliminations would silently revert on the next read.
    await prisma.$transaction([
      prisma.game.update({ where: { id: game.id }, data: { state: state as unknown as Prisma.InputJsonValue } }),
      ...game.players.map(p =>
        prisma.gamePlayer.update({
          where: { id: p.id },
          data: {
            position: p.position,
            isAlive: p.isAlive,
            score: p.score,
            disconnected: p.disconnected,
          },
        })
      ),
    ]);
  }

  private static async finishGame(game: GameWithPlayers, state: GamePhaseState, winnerId: string) {
    await prisma.$transaction([
      prisma.game.update({
        where: { id: game.id },
        data: { status: 'FINISHED', state: state as unknown as Prisma.InputJsonValue, winnerId, endedAt: new Date() },
      }),
      ...game.players.map(p =>
        prisma.gameStats.update({
          where: { userId: p.userId },
          data: {
            gamesPlayed: { increment: 1 },
            gamesWon: { increment: p.id === winnerId ? 1 : 0 },
            gamesLost: { increment: p.id === winnerId ? 0 : 1 },
            totalScore: { increment: p.id === winnerId ? 100 : 0 },
          },
        })
      ),
      prisma.gameEvent.create({
        data: {
          gameId: game.id,
          type: 'WIN',
          playerId: winnerId,
          data: { envelope: state.envelopeRevealed ? this.envelopeOf(game) : null, winnerId } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);
  }

  private static envelopeOf(game: GameWithPlayers) {
    try {
      return decryptEnvelope<Envelope>(game.envelope || '');
    } catch {
      return null;
    }
  }

  // ---- read-side: per-player redacted state -------------------------------

  static async getGameState(gameId: string, viewerUserId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, isBot: true } } } },
      },
    });
    if (!game) throw new NotFoundError('Game not found');

    const viewer = game.players.find(p => p.userId === viewerUserId);
    const state = (game.state || {}) as unknown as GamePhaseState;
    const isFinished = state.phase === 'finished';
    const envelope = isFinished ? this.envelopeOf(game) : null;
    const myPlayerId = viewer?.id ?? null;

    const players = game.players.map(p => ({
      id: p.id,
      userId: p.userId,
      username: p.user.username,
      displayName: p.user.displayName,
      isBot: p.user.isBot,
      characterId: p.characterId,
      position: p.position,
      isAlive: p.isAlive,
      disconnected: p.disconnected,
      isHost: p.userId === game.hostId,
      isOnline: p.user.isOnline,
      score: p.score,
    }));

    const s = state.pendingSuggestion;
    let pendingSuggestion: Record<string, unknown> | null = null;
    if (s) {
      const isAwaitingMe = s.awaitingPlayerId === myPlayerId;
      const isSuggesterMe = s.suggesterPlayerId === myPlayerId;
      pendingSuggestion = {
        suggesterPlayerId: s.suggesterPlayerId,
        suspectId: s.suspectId,
        weaponId: s.weaponId,
        roomId: s.roomId,
        awaitingPlayerId: s.awaitingPlayerId,
        awaitingMe: isAwaitingMe,
        revealOptions: isAwaitingMe ? s.awaitingCards : [],
        revealedCardId: isSuggesterMe && s.revealedCardId ? s.revealedCardId : null,
        revealedBy: s.revealedBy,
      };
    }

    return {
      gameId: game.id,
      name: game.name,
      status: game.status,
      maxPlayers: game.maxPlayers,
      settings: game.settings,
      phase: state.phase,
      turnOrder: state.turnOrder,
      turnIndex: state.turnIndex,
      currentPlayerId: state.turnOrder[state.turnIndex] ?? null,
      dice: state.dice,
      stepsRemaining: state.stepsRemaining,
      moved: state.moved,
      suggestedThisTurn: state.suggestedThisTurn,
      myPlayerId,
      myHand: viewer ? (Array.isArray(viewer.hand) ? viewer.hand : []) : [],
      players,
      pendingSuggestion,
      winnerId: state.winnerId,
      envelope: envelope ? { suspectId: envelope.suspectId, weaponId: envelope.weaponId, roomId: envelope.roomId } : null,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
    };
  }

  static async getEvents(gameId: string, limit = 60) {
    return prisma.gameEvent.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { player: { include: { user: { select: { username: true, displayName: true } } } } },
    });
  }
}
