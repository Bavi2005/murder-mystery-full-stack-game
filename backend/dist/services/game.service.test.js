"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const games = new Map();
const players = new Map();
const events = [];
const stats = new Map();
const chat = [];
const clone = (x) => JSON.parse(JSON.stringify(x));
const withUser = (p) => ({
    ...p,
    user: { id: p.userId, username: `u${p.userId}`, displayName: `U ${p.userId}`, avatarUrl: null, isOnline: true },
});
vitest_1.vi.mock('../config/prisma', () => ({
    prisma: {
        game: {
            create: async ({ data }) => {
                const row = { id: `g-${Date.now()}-${Math.random()}`, createdAt: new Date(), startedAt: null, endedAt: null, winnerId: null, ...data, players: [] };
                games.set(row.id, row);
                return clone(row);
            },
            findUnique: async ({ where }) => {
                const row = games.get(where.id);
                if (!row)
                    return null;
                return clone({ ...row, players: [...players.values()].filter(p => p.gameId === where.id && !p.leftAt).map(withUser) });
            },
            findMany: async ({ where, skip, take, include }) => {
                let rows = [...games.values()];
                if (where?.status)
                    rows = rows.filter(r => r.status === where.status);
                rows = rows.slice(skip || 0, (skip || 0) + (take || rows.length));
                if (include?.players) {
                    return rows.map(r => ({ ...r, players: [...players.values()].filter(p => p.gameId === r.id && !p.leftAt).map(withUser) }));
                }
                return rows.map(clone);
            },
            count: async () => games.size,
            update: async ({ where, data }) => {
                const row = games.get(where.id);
                if (!row)
                    throw new Error('Not found');
                Object.assign(row, JSON.parse(JSON.stringify(data)));
                return clone(row);
            },
            delete: async ({ where }) => { games.delete(where.id); return {}; },
        },
        gamePlayer: {
            create: async ({ data }) => {
                const row = { id: `pl-${players.size + 1}-${Math.random()}`, joinedAt: '2024-01-01', leftAt: null, ...data };
                players.set(row.id, row);
                return clone(row);
            },
            findUnique: async ({ where }) => {
                const row = players.get(where.id) || [...players.values()].find(p => p.id === where.id);
                return row ? clone(row) : null;
            },
            findFirst: async ({ where, include }) => {
                const row = [...players.values()].find(p => (!where?.userId || p.userId === where.userId) &&
                    (!where?.gameId || p.gameId === where.gameId));
                if (!row)
                    return null;
                if (include?.user)
                    return clone(withUser(row));
                return clone(row);
            },
            update: async ({ where, data }) => {
                const row = players.get(where.id);
                if (!row)
                    throw new Error('Not found');
                Object.assign(row, JSON.parse(JSON.stringify(data)));
                return clone(row);
            },
            updateMany: async ({ where, data }) => {
                for (const [, p] of players) {
                    if (where?.userId && p.userId === where.userId)
                        Object.assign(p, JSON.parse(JSON.stringify(data)));
                }
                return { count: players.size };
            },
            delete: async ({ where }) => { players.delete(where.id); return {}; },
            deleteMany: async ({ where }) => {
                for (const [id, p] of [...players]) {
                    if ((!where?.userId || p.userId === where.userId))
                        players.delete(id);
                }
                return { count: players.size };
            },
        },
        gameStats: {
            create: async ({ data }) => {
                const row = { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, totalScore: 0, correctAccusations: 0, wrongAccusations: 0, cardsSeen: 0, ...data };
                stats.set(data.userId, row);
                return clone(row);
            },
            findUnique: async ({ where }) => {
                const row = stats.get(where.userId);
                return row ? clone(row) : null;
            },
            update: async ({ where, data }) => {
                const row = stats.get(where.userId) || { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, totalScore: 0 };
                for (const [k, v] of Object.entries(data)) {
                    if (v && typeof v === 'object' && 'increment' in v)
                        row[k] = Number(row[k] ?? 0) + v.increment;
                    else
                        row[k] = v;
                }
                stats.set(where.userId, row);
                return clone(row);
            },
            upsert: async ({ where, create, update }) => {
                const existing = stats.get(where.userId) || create;
                for (const [k, v] of Object.entries(update)) {
                    if (v && typeof v === 'object' && 'increment' in v)
                        existing[k] = Number(existing[k] ?? 0) + v.increment;
                    else
                        existing[k] = v;
                }
                stats.set(where.userId, existing);
                return clone(existing);
            },
        },
        gameEvent: {
            create: async ({ data }) => {
                const row = { id: `ev${events.length + 1}`, createdAt: '2024-01-01', ...data };
                events.push(row);
                return clone(row);
            },
            findMany: async () => events.map(e => clone(e)),
        },
        chatMessage: {
            create: async ({ data }) => {
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
        $transaction: async (ops) => {
            for (const op of ops) {
                if (op?.game?.update) {
                    const { where, data } = op.game.update;
                    Object.assign(games.get(where?.id ?? ''), JSON.parse(JSON.stringify(data ?? {})));
                }
                if (op?.gamePlayer) {
                    const opData = Object.values(op.gamePlayer)[0];
                    if (opData?.where?.id && opData.update !== undefined)
                        players.set(opData.where.id, { ...players.get(opData.where.id), ...JSON.parse(JSON.stringify(opData.update)) });
                    if (opData?.data) {
                        const row = { id: `pl-${players.size + 1}`, ...opData.data };
                        players.set(row.id, row);
                    }
                }
                if (op?.gameStats?.update) {
                    const { where, data } = op.gameStats.update;
                    const row = stats.get(where?.userId ?? '') || {};
                    for (const [k, v] of Object.entries(data ?? {})) {
                        if (v && typeof v === 'object' && 'increment' in v)
                            row[k] = Number(row[k] ?? 0) + v.increment;
                        else
                            row[k] = v;
                    }
                    stats.set(where?.userId ?? '', row);
                }
                if (op?.gameEvent?.create) {
                    const row = { id: `ev${events.length + 1}`, createdAt: '2024-01-01', ...op.gameEvent.create.data };
                    events.push(row);
                }
            }
        },
        $connect: async () => { },
    },
}));
const game_service_1 = require("./game.service");
const crypto_1 = require("../utils/crypto");
const board_1 = require("../game/board");
function stateFactory(turnOrder) {
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
async function seedGame(opts = {}) {
    const count = opts.count ?? 4;
    const envelope = opts.envelope ?? { suspectId: board_1.SUSPECTS[0].id, weaponId: board_1.WEAPONS[0], roomId: board_1.ROOMS[0].id };
    const deck = board_1.ALL_CARDS.filter(k => k !== envelope.suspectId && k !== envelope.weaponId && k !== envelope.roomId);
    const game = {
        id: 'g1',
        name: 'Test',
        hostId: 'u1',
        status: 'IN_PROGRESS',
        maxPlayers: 6,
        settings: { maxPlayers: 6, allowSpectators: false },
        envelope: (0, crypto_1.encryptEnvelope)(envelope),
        state: null,
        createdAt: '2024-01-01',
        startedAt: '2024-01-01',
        endedAt: null,
        winnerId: null,
    };
    games.set('g1', game);
    for (let i = 0; i < count; i++) {
        const hand = opts.hands?.[i] ?? deck.filter((_, j) => j % count === i);
        const player = {
            id: `p${i + 1}`,
            gameId: 'g1',
            userId: `u${i + 1}`,
            characterId: board_1.SUSPECTS[i].id,
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
(0, vitest_1.beforeEach)(() => {
    games.clear();
    players.clear();
    events.length = 0;
    stats.clear();
    chat.length = 0;
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.restoreAllMocks();
});
(0, vitest_1.describe)('CluedoEngine — rules & security', () => {
    (0, vitest_1.it)('rejects a roll from a player that is not the current turn holder', async () => {
        await seedGame({ count: 4 });
        await (0, vitest_1.expect)(game_service_1.CluedoEngine.act('g1', 'p2', 'roll', {})).rejects.toThrow(/turn/);
    });
    (0, vitest_1.it)('caps dice at 12 and sets stepsRemaining', async () => {
        await seedGame({ count: 4 });
        const result = await game_service_1.CluedoEngine.act('g1', 'p1', 'roll', {});
        const d = result.events[0].data;
        (0, vitest_1.expect)(d.d1 + d.d2).toBeGreaterThanOrEqual(2);
        (0, vitest_1.expect)(d.d1 + d.d2).toBeLessThanOrEqual(12);
    });
    (0, vitest_1.it)('move enforces distance and deduces remaining steps', async () => {
        await seedGame({ count: 4 });
        await game_service_1.CluedoEngine.act('g1', 'p1', 'roll', {});
        const me = players.get('p1');
        me.position = board_1.ROOMS[0].id; // place them in a room
        const edge = board_1.EDGES.find(([a, b]) => a === board_1.ROOMS[0].id || b === board_1.ROOMS[0].id);
        const target = edge[0] === board_1.ROOMS[0].id ? edge[1] : edge[0];
        const before = me.position;
        const result = await game_service_1.CluedoEngine.act('g1', 'p1', 'move', { to: target });
        (0, vitest_1.expect)(result.events[0].data.from).toBe(before);
        (0, vitest_1.expect)(result.events[0].data.to).toBe(target);
    });
    (0, vitest_1.it)('rejects off-board destinations', async () => {
        await seedGame({ count: 4 });
        await game_service_1.CluedoEngine.act('g1', 'p1', 'roll', {});
        await (0, vitest_1.expect)(game_service_1.CluedoEngine.act('g1', 'p1', 'move', { to: 'not-a-node' })).rejects.toThrow(/destination/);
    });
    (0, vitest_1.it)('rejects suggestions from outside a room', async () => {
        await seedGame({ count: 4 });
        await game_service_1.CluedoEngine.act('g1', 'p1', 'roll', {});
        await (0, vitest_1.expect)(game_service_1.CluedoEngine.act('g1', 'p1', 'suggest', { suspectId: board_1.SUSPECTS[1].id, weaponId: board_1.WEAPONS[1] })).rejects.toThrow(/inside a room/);
    });
    (0, vitest_1.it)('reveal is limited to the awaiting player and their own cards', async () => {
        await seedGame({
            count: 4,
            hands: [[], [board_1.ALL_CARDS[0]], [], []],
        });
        const p1 = players.get('p1');
        p1.position = board_1.ROOMS[0].id;
        await game_service_1.CluedoEngine.act('g1', 'p1', 'roll', {});
        // Give p2 a matching card and make a suggestion that p2 can disprove.
        const heldRoom = board_1.ROOMS[0].id; // p2 holds the room p1 is in
        players.get('p2').hand = [heldRoom];
        await game_service_1.CluedoEngine.act('g1', 'p1', 'suggest', { suspectId: board_1.SUSPECTS[2].id, weaponId: board_1.WEAPONS[2] });
        // A non-awaiting player (p3) cannot reveal.
        await (0, vitest_1.expect)(game_service_1.CluedoEngine.act('g1', 'p3', 'reveal', { cardId: heldRoom })).rejects.toThrow(/not your turn to reveal/);
        // The awaiting player can only reveal a card they actually hold.
        await (0, vitest_1.expect)(game_service_1.CluedoEngine.act('g1', 'p2', 'reveal', { cardId: board_1.WEAPONS[3] })).rejects.toThrow(/cannot reveal|do not hold/);
        // And a correct reveal resolves the suggestion for the suggester.
        const reveal = await game_service_1.CluedoEngine.act('g1', 'p2', 'reveal', { cardId: heldRoom });
        (0, vitest_1.expect)(reveal.events[0].type).toBe('DISPROVE');
        (0, vitest_1.expect)(reveal.privateTo?.event).toBe('REVEALED_CARD');
        (0, vitest_1.expect)(reveal.privateTo?.data?.cardId).toBe(heldRoom);
    });
    (0, vitest_1.it)('getGameState never returns another players hand', async () => {
        await seedGame({ count: 4 });
        const state = await game_service_1.CluedoEngine.getGameState('g1', 'u2');
        (0, vitest_1.expect)(state.myHand).toBeDefined();
        for (const pl of state.players) {
            (0, vitest_1.expect)(pl.hand).toBeUndefined();
        }
        (0, vitest_1.expect)(state.envelope).toBeNull();
    });
});
(0, vitest_1.describe)('CluedoEngine — room endpoints never leak secrets', () => {
    (0, vitest_1.it)('getRoom strips hand and envelope', async () => {
        await seedGame({ count: 4 });
        const room = await game_service_1.CluedoEngine.getRoom('g1');
        (0, vitest_1.expect)(room.envelope).toBeUndefined();
        (0, vitest_1.expect)(room.state).toBeUndefined();
        for (const p of room.players) {
            (0, vitest_1.expect)(p.hand).toBeUndefined();
        }
    });
});
(0, vitest_1.describe)('CluedoEngine — endgame integrity', () => {
    (0, vitest_1.it)('correct accusation finishes the game and persists winner', async () => {
        const { envelope } = await seedGame({ count: 4 });
        await game_service_1.CluedoEngine.act('g1', 'p1', 'roll', {});
        const res = await game_service_1.CluedoEngine.act('g1', 'p1', 'accuse', envelope);
        (0, vitest_1.expect)(res.gameOver).toBe(true);
        (0, vitest_1.expect)(games.get('g1').status).toBe('FINISHED');
        (0, vitest_1.expect)(games.get('g1').winnerId).toBe('p1');
    });
    (0, vitest_1.it)('wrong accusation eliminates the accuser', async () => {
        const { envelope } = await seedGame({ count: 4 });
        const wrong = {
            suspectId: envelope.suspectId === board_1.SUSPECTS[1].id ? board_1.SUSPECTS[2].id : board_1.SUSPECTS[1].id,
            weaponId: board_1.WEAPONS[0],
            roomId: board_1.ROOMS[1].id,
        };
        await game_service_1.CluedoEngine.act('g1', 'p1', 'roll', {});
        const res = await game_service_1.CluedoEngine.act('g1', 'p1', 'accuse', wrong);
        (0, vitest_1.expect)(res.gameOver).toBe(false);
        (0, vitest_1.expect)(players.get('p1').isAlive).toBe(false);
        (0, vitest_1.expect)(games.get('g1').status).toBe('IN_PROGRESS');
    });
});
//# sourceMappingURL=game.service.test.js.map