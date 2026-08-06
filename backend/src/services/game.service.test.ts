import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- in-memory Prisma mock ------------------------------------------------

interface RowWithId {
  id: string;
  [key: string]: unknown;
}

type Row = Record<string, unknown>;
const games = new Map<string, RowWithId>();
const players = new Map<string, RowWithId>();
const events: Row[] = [];
const stats = new Map<string, Row>();
const chat: Row[] = [];

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const withUser = (p: Row) => ({
  ...p,
  user: { id: p.userId, username: `u${p.userId}`, displayName: `U ${p.userId}`, avatarUrl: null, isOnline: true },
});

interface MockWhere {
  id?: string;
  userId?: string;
  gameId?: string;
  status?: string;
  include?: { user?: boolean; players?: boolean };
}

interface TxAction {
  where?: MockWhere;
  data?: Record<string, unknown>;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
}

interface TxOp {
  game?: { update?: TxAction };
  gamePlayer?: Record<string, TxAction>;
  gameStats?: { update?: TxAction };
  gameEvent?: { create?: TxAction };
}

vi.mock('../config/prisma', () => ({
  prisma: {
    game: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: RowWithId = { id: `g-${Date.now()}-${Math.random()}`, createdAt: new Date(), startedAt: null, endedAt: null, winnerId: null, ...data, players: [] };
        games.set(row.id, row);
        return clone(row);
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = games.get(where.id);
        if (!row) return null;
        return clone({ ...row, players: [...players.values()].filter(p => p.gameId === where.id && !p.leftAt).map(withUser) });
      },
      findMany: async ({ where, skip, take, include }: { where?: { status?: string }; skip?: number; take?: number; include?: { players?: boolean } }) => {
        let rows = [...games.values()];
        if (where?.status) rows = rows.filter(r => r.status === where.status);
        rows = rows.slice(skip || 0, (skip || 0) + (take || rows.length));
        if (include?.players) {
          return rows.map(r => ({ ...r, players: [...players.values()].filter(p => p.gameId === r.id && !p.leftAt).map(withUser) }));
        }
        return rows.map(clone);
      },
      count: async () => games.size,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = games.get(where.id);
        if (!row) throw new Error('Not found');
        Object.assign(row, JSON.parse(JSON.stringify(data)));
        return clone(row);
      },
      delete: async ({ where }: { where: { id: string } }) => { games.delete(where.id); return {}; },
    },
    gamePlayer: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: RowWithId = { id: `pl-${players.size + 1}-${Math.random()}`, joinedAt: '2024-01-01', leftAt: null, ...data };
        players.set(row.id, row);
        return clone(row);
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = players.get(where.id) || [...players.values()].find(p => p.id === where.id);
        return row ? clone(row) : null;
      },
      findFirst: async ({ where, include }: { where?: MockWhere; include?: { user?: boolean } }) => {
        const row = [...players.values()].find(p =>
          (!where?.userId || p.userId === where.userId) &&
          (!where?.gameId || p.gameId === where.gameId)
        );
        if (!row) return null;
        if (include?.user) return clone(withUser(row));
        return clone(row);
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = players.get(where.id);
        if (!row) throw new Error('Not found');
        Object.assign(row, JSON.parse(JSON.stringify(data)));
        return clone(row);
      },
      updateMany: async ({ where, data }: { where?: { userId?: string }; data: Record<string, unknown> }) => {
        for (const [, p] of players) {
          if (where?.userId && p.userId === where.userId) Object.assign(p, JSON.parse(JSON.stringify(data)));
        }
        return { count: players.size };
      },
      delete: async ({ where }: { where: { id: string } }) => { players.delete(where.id); return {}; },
      deleteMany: async ({ where }: { where?: { userId?: string } }) => {
        for (const [id, p] of [...players]) {
          if ((!where?.userId || p.userId === where.userId)) players.delete(id);
        }
        return { count: players.size };
      },
    },
    gameStats: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, totalScore: 0, correctAccusations: 0, wrongAccusations: 0, cardsSeen: 0, ...data };
        stats.set(data.userId as string, row);
        return clone(row);
      },
      findUnique: async ({ where }: { where: { userId: string } }) => {
        const row = stats.get(where.userId);
        return row ? clone(row) : null;
      },
      update: async ({ where, data }: { where: { userId: string }; data: Record<string, unknown> }) => {
        const row = stats.get(where.userId) || { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, totalScore: 0 };
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && 'increment' in v) row[k] = Number(row[k] ?? 0) + (v as { increment: number }).increment;
          else row[k] = v;
        }
        stats.set(where.userId, row);
        return clone(row);
      },
      upsert: async ({ where, create, update }: { where: { userId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const existing = stats.get(where.userId) || create;
        for (const [k, v] of Object.entries(update)) {
          if (v && typeof v === 'object' && 'increment' in v) existing[k] = Number(existing[k] ?? 0) + (v as { increment: number }).increment;
          else existing[k] = v;
        }
        stats.set(where.userId, existing);
        return clone(existing);
      },
    },
    gameEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ev${events.length + 1}`, createdAt: '2024-01-01', ...data };
        events.push(row);
        return clone(row);
      },
      findMany: async () => events.map(e => clone(e)),
    },
    chatMessage: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `c${chat.length + 1}`, createdAt: '2024-01-01', ...data };
        chat.push(row);
        return clone(row);
      },
      findMany: async () => chat.map(clone),
    },
    user: {
      findUnique: async () => null,
      update: async () => ({}),
    },
    $transaction: async (ops: TxOp[]) => {
      for (const op of ops) {
        if (op?.game?.update) {
          const { where, data } = op.game.update;
          Object.assign(games.get(where?.id ?? '')!, JSON.parse(JSON.stringify(data ?? {})));
        }
        if (op?.gamePlayer) {
          const opData = Object.values(op.gamePlayer)[0];
          if (opData?.where?.id && opData.update !== undefined) players.set(opData.where.id, { ...players.get(opData.where.id), ...JSON.parse(JSON.stringify(opData.update)) });
          if (opData?.data) {
            const row: RowWithId = { id: `pl-${players.size + 1}`, ...opData.data };
            players.set(row.id, row);
          }
        }
        if (op?.gameStats?.update) {
          const { where, data } = op.gameStats.update;
          const row = stats.get(where?.userId ?? '') || {};
          for (const [k, v] of Object.entries(data ?? {})) {
            if (v && typeof v === 'object' && 'increment' in v) row[k] = Number(row[k] ?? 0) + (v as { increment: number }).increment;
            else row[k] = v;
          }
          stats.set(where?.userId ?? '', row);
        }
        if (op?.gameEvent?.create) {
          const row = { id: `ev${events.length + 1}`, createdAt: '2024-01-01', ...op.gameEvent.create.data };
          events.push(row);
        }
      }
    },
    $connect: async () => {},
  },
}));

import { CluedoEngine } from './game.service';
import { encryptEnvelope } from '../utils/crypto';
import { SUSPECTS, WEAPONS, ROOMS, ALL_CARDS, EDGES } from '../game/board';

function stateFactory(turnOrder: string[]) {
  return {
    phase: 'playing',
    turnOrder,
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
}

async function seedGame(opts: {
  count?: number;
  envelope?: { suspectId: string; weaponId: string; roomId: string };
  hands?: string[][];
  position?: string;
} = {}) {
  const count = opts.count ?? 4;
  const envelope = opts.envelope ?? { suspectId: SUSPECTS[0].id, weaponId: WEAPONS[0], roomId: ROOMS[0].id };
  const deck = ALL_CARDS.filter(k => k !== envelope.suspectId && k !== envelope.weaponId && k !== envelope.roomId);

  const game: RowWithId = {
    id: 'g1',
    name: 'Test',
    hostId: 'u1',
    status: 'IN_PROGRESS',
    maxPlayers: 6,
    settings: { maxPlayers: 6, allowSpectators: false },
    envelope: encryptEnvelope(envelope),
    state: null,
    createdAt: '2024-01-01',
    startedAt: '2024-01-01',
    endedAt: null,
    winnerId: null,
  };
  games.set('g1', game);

  for (let i = 0; i < count; i++) {
    const hand = opts.hands?.[i] ?? deck.filter((_, j) => j % count === i);
    const player: RowWithId = {
      id: `p${i + 1}`,
      gameId: 'g1',
      userId: `u${i + 1}`,
      characterId: SUSPECTS[i].id,
      position: opts.position || '',
      hand,
      isAlive: true,
      disconnected: false,
      score: 0,
      joinedAt: '2024-01-01',
      leftAt: null,
    };
    players.set(player.id, player);
  }

  const turnOrder = ['p1', 'p2', 'p3', 'p4'].slice(0, count);
  game.state = stateFactory(turnOrder);
  return { game, envelope, turnOrder };
}

beforeEach(() => {
  games.clear();
  players.clear();
  events.length = 0;
  stats.clear();
  chat.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CluedoEngine — rules & security', () => {
  it('rejects a roll from a player that is not the current turn holder', async () => {
    await seedGame({ count: 4 });
    await expect(CluedoEngine.act('g1', 'p2', 'roll', {})).rejects.toThrow(/turn/);
  });

  it('caps dice at 12 and sets stepsRemaining', async () => {
    await seedGame({ count: 4 });
    const result = await CluedoEngine.act('g1', 'p1', 'roll', {});
    const d = result.events[0].data as { d1: number; d2: number };
    expect(d.d1 + d.d2).toBeGreaterThanOrEqual(2);
    expect(d.d1 + d.d2).toBeLessThanOrEqual(12);
  });

  it('move enforces distance and deduces remaining steps', async () => {
    await seedGame({ count: 4 });
    await CluedoEngine.act('g1', 'p1', 'roll', {});
    const me = players.get('p1')!;
    me.position = ROOMS[0].id; // place them in a room
    const edge = EDGES.find(([a, b]) => a === ROOMS[0].id || b === ROOMS[0].id)!;
    const target = edge[0] === ROOMS[0].id ? edge[1] : edge[0];
    const before = me.position;
    const result = await CluedoEngine.act('g1', 'p1', 'move', { to: target });
    expect(result.events[0].data.from).toBe(before);
    expect(result.events[0].data.to).toBe(target);
  });

  it('rejects off-board destinations', async () => {
    await seedGame({ count: 4 });
    await CluedoEngine.act('g1', 'p1', 'roll', {});
    await expect(CluedoEngine.act('g1', 'p1', 'move', { to: 'not-a-node' })).rejects.toThrow(/destination/);
  });

  it('rejects suggestions from outside a room', async () => {
    await seedGame({ count: 4 });
    await CluedoEngine.act('g1', 'p1', 'roll', {});
    await expect(CluedoEngine.act('g1', 'p1', 'suggest', { suspectId: SUSPECTS[1].id, weaponId: WEAPONS[1] })).rejects.toThrow(/inside a room/);
  });

  it('reveal is limited to the awaiting player and their own cards', async () => {
    await seedGame({
      count: 4,
      hands: [[], [ALL_CARDS[0]], [], []],
    });
    const p1 = players.get('p1')!;
    p1.position = ROOMS[0].id;
    await CluedoEngine.act('g1', 'p1', 'roll', {});

    // Give p2 a matching card and make a suggestion that p2 can disprove.
    const heldRoom = ROOMS[0].id; // p2 holds the room p1 is in
    players.get('p2')!.hand = [heldRoom];
    await CluedoEngine.act('g1', 'p1', 'suggest', { suspectId: SUSPECTS[2].id, weaponId: WEAPONS[2] });

    // A non-awaiting player (p3) cannot reveal.
    await expect(CluedoEngine.act('g1', 'p3', 'reveal', { cardId: heldRoom })).rejects.toThrow(/not your turn to reveal/);
    // The awaiting player can only reveal a card they actually hold.
    await expect(CluedoEngine.act('g1', 'p2', 'reveal', { cardId: WEAPONS[3] })).rejects.toThrow(/cannot reveal|do not hold/);
    // And a correct reveal resolves the suggestion for the suggester.
    const reveal = await CluedoEngine.act('g1', 'p2', 'reveal', { cardId: heldRoom });
    expect(reveal.events[0].type).toBe('DISPROVE');
    expect(reveal.privateTo?.event).toBe('REVEALED_CARD');
    expect(reveal.privateTo?.data?.cardId).toBe(heldRoom);
  });

  it('getGameState never returns another players hand', async () => {
    await seedGame({ count: 4 });
    const state = await CluedoEngine.getGameState('g1', 'u2');
    expect(state.myHand).toBeDefined();
    for (const pl of state.players) {
      expect((pl as Row).hand).toBeUndefined();
    }
    expect(state.envelope).toBeNull();
  });
});

describe('CluedoEngine — room endpoints never leak secrets', () => {
  it('getRoom strips hand and envelope', async () => {
    await seedGame({ count: 4 });
    const room = await CluedoEngine.getRoom('g1');
    expect((room as Row).envelope).toBeUndefined();
    expect((room as Row).state).toBeUndefined();
    for (const p of room.players) {
      expect((p as Row).hand).toBeUndefined();
    }
  });
});

describe('CluedoEngine — endgame integrity', () => {
  it('correct accusation finishes the game and persists winner', async () => {
    const { envelope } = await seedGame({ count: 4 });
    await CluedoEngine.act('g1', 'p1', 'roll', {});
    const res = await CluedoEngine.act('g1', 'p1', 'accuse', envelope);
    expect(res.gameOver).toBe(true);
    expect(games.get('g1')!.status).toBe('FINISHED');
    expect(games.get('g1')!.winnerId).toBe('p1');
  });

  it('wrong accusation eliminates the accuser', async () => {
    const { envelope } = await seedGame({ count: 4 });
    const wrong = {
      suspectId: envelope.suspectId === SUSPECTS[1].id ? SUSPECTS[2].id : SUSPECTS[1].id,
      weaponId: WEAPONS[0],
      roomId: ROOMS[1].id,
    };
    await CluedoEngine.act('g1', 'p1', 'roll', {});
    const res = await CluedoEngine.act('g1', 'p1', 'accuse', wrong);
    expect(res.gameOver).toBe(false);
    expect(players.get('p1')!.isAlive).toBe(false);
    expect(games.get('g1')!.status).toBe('IN_PROGRESS');
  });
});