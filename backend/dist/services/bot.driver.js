"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driveBotTurns = exports.unregisterGameSocket = exports.registerGameSocket = void 0;
const game_service_1 = require("./game.service");
const prisma_1 = require("../config/prisma");
const board_1 = require("../game/board");
const eventLabel_1 = require("../game/eventLabel");
const BOT_ACTION_DELAY_MS = 1700;
const activeGames = new Map();
const botLocks = new Map();
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
const registerGameSocket = (gameKey, socket) => {
    if (!activeGames.has(gameKey))
        activeGames.set(gameKey, new Set());
    activeGames.get(gameKey).add(socket);
};
exports.registerGameSocket = registerGameSocket;
const unregisterGameSocket = (gameKey, socket) => {
    activeGames.get(gameKey)?.delete(socket);
    if (activeGames.get(gameKey)?.size === 0)
        activeGames.delete(gameKey);
};
exports.unregisterGameSocket = unregisterGameSocket;
async function broadcastGameResult(io, gameId, result) {
    const sockets = [...(activeGames.get(`game:${gameId}`) || [])];
    for (const event of result.events) {
        const label = (0, eventLabel_1.eventLabel)(event.type, event.data);
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
        const userId = target.userId;
        if (!userId)
            continue;
        void game_service_1.CluedoEngine.getGameState(gameId, userId)
            .then(state => target.emit('game:state', state))
            .catch(() => { });
    }
}
async function actAndBroadcast(io, gameId, playerId, action, payload = {}) {
    const result = await game_service_1.CluedoEngine.act(gameId, playerId, action, payload);
    await broadcastGameResult(io, gameId, result);
    return result;
}
async function snapshot(gameId) {
    const game = await prisma_1.prisma.game.findUnique({
        where: { id: gameId },
        include: { players: { include: { user: { select: { isBot: true } } } } },
    });
    if (!game || game.status !== 'IN_PROGRESS')
        return null;
    const state = game.state;
    const turnOrder = state.turnOrder || [];
    const turnIndex = state.turnIndex || 0;
    const meId = turnOrder[turnIndex] ?? '';
    const me = game.players.find(p => p.id === meId);
    if (!me?.user?.isBot)
        return null;
    const ps = state.pendingSuggestion;
    return {
        meId: me.id,
        isAlive: me.isAlive,
        dice: state.dice ?? null,
        stepsRemaining: state.stepsRemaining || 0,
        position: me.position,
        characterId: me.characterId,
        hand: Array.isArray(me.hand) ? me.hand : [],
        phase: state.phase,
        players: game.players.map(p => ({ id: p.id, isAlive: p.isAlive, position: p.position })),
        awaitingPlayerId: ps?.awaitingPlayerId ?? null,
        awaitingCards: ps?.awaitingCards ?? [],
    };
}
function pickTarget(s, from) {
    const steps = s.stepsRemaining;
    const rooms = s.players
        .filter(p => p.id !== s.meId && p.isAlive && board_1.ROOM_IDS.includes(p.position))
        .map(p => p.position);
    const roomCandidates = rooms.filter(roomId => {
        const d = (0, board_1.distance)(from, roomId);
        return d !== null && d > 0 && d <= steps;
    });
    if (roomCandidates.length > 0) {
        const target = roomCandidates[Math.floor(Math.random() * roomCandidates.length)];
        if (target)
            return target;
    }
    const corridorOptions = Object.values(board_1.NODE_MAP)
        .filter(n => n.kind === 'corridor' && n.id !== from)
        .map(n => n.id)
        .filter(id => {
        const d = (0, board_1.distance)(from, id);
        return d !== null && d > 0 && d <= steps;
    });
    if (corridorOptions.length === 0)
        return null;
    const node = corridorOptions[Math.floor(Math.random() * corridorOptions.length)];
    return node || null;
}
function suggestPicks(s) {
    const known = new Set(s.hand);
    const suspects = shuffle(board_1.SUSPECTS.filter(x => !known.has(x.id)));
    const weapons = shuffle(board_1.WEAPONS.filter(w => !known.has(w)));
    const suspectId = suspects.length > 0 ? suspects[0].id : board_1.SUSPECTS[Math.floor(Math.random() * board_1.SUSPECTS.length)].id;
    const weaponId = weapons.length > 0 ? weapons[0] : board_1.WEAPONS[Math.floor(Math.random() * board_1.WEAPONS.length)];
    return { suspectId, weaponId };
}
const driveBotTurns = async (io, gameId) => {
    if (botLocks.get(gameId))
        return;
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
            if (s.phase !== 'playing')
                return;
            for (let guard = 0; guard < 12; guard++) {
                if (s.awaitingPlayerId) {
                    if (s.awaitingPlayerId === s.meId && s.awaitingCards.length > 0) {
                        const cardId = s.awaitingCards[Math.floor(Math.random() * s.awaitingCards.length)];
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
                    void (0, exports.driveBotTurns)(io, gameId);
                    return;
                }
                if (s.stepsRemaining > 0) {
                    const target = pickTarget(s, s.position);
                    if (target) {
                        await actAndBroadcast(io, gameId, s.meId, 'move', { to: target });
                        await sleep(BOT_ACTION_DELAY_MS);
                        void (0, exports.driveBotTurns)(io, gameId);
                        return;
                    }
                    break;
                }
                if (board_1.ROOM_IDS.includes(s.position)) {
                    const { suspectId, weaponId } = suggestPicks(s);
                    await actAndBroadcast(io, gameId, s.meId, 'suggest', { suspectId, weaponId });
                    await sleep(BOT_ACTION_DELAY_MS);
                }
                break;
            }
            await actAndBroadcast(io, gameId, s.meId, 'endTurn');
            await sleep(BOT_ACTION_DELAY_MS);
            void (0, exports.driveBotTurns)(io, gameId);
            return;
        }
    }
    finally {
        botLocks.delete(gameId);
    }
};
exports.driveBotTurns = driveBotTurns;
//# sourceMappingURL=bot.driver.js.map