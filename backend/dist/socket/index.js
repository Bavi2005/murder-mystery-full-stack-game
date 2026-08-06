"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = void 0;
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../config/prisma");
const logger_1 = require("../utils/logger");
const game_service_1 = require("../services/game.service");
const eventLabel_1 = require("../game/eventLabel");
const validators_1 = require("../validators");
const bot_driver_1 = require("../services/bot.driver");
const userSockets = new Map();
const activeGames = new Map();
// Per-socket action rate limiter (token bucket). Guards against spamming
// game actions over the socket to busy-loop the engine.
const socketLimits = new Map();
const SOCKET_LIMIT_MAX = 30;
const SOCKET_LIMIT_REFILL_MS = 60_000;
function socketAllowed(socketId, cost = 1) {
    const now = Date.now();
    const entry = socketLimits.get(socketId) || { tokens: SOCKET_LIMIT_MAX, lastRefill: now };
    entry.tokens = Math.min(SOCKET_LIMIT_MAX, entry.tokens + ((now - entry.lastRefill) / SOCKET_LIMIT_REFILL_MS) * SOCKET_LIMIT_MAX);
    entry.lastRefill = now;
    if (entry.tokens < cost)
        return false;
    entry.tokens -= cost;
    socketLimits.set(socketId, entry);
    if (socketLimits.size > 5000) {
        const entries = [...socketLimits.entries()].reverse().slice(0, 4000);
        socketLimits.clear();
        entries.forEach(([k, v]) => socketLimits.set(k, v));
    }
    return true;
}
async function requireUser(userId) {
    return prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true },
    });
}
const setupSocketHandlers = (io) => {
    // ---- authn middleware ----------------------------------------------------
    io.use(async (socket, next) => {
        try {
            // Socket.io handshake `auth.token` — require a valid access token, NOT
            // the refresh token. Cookies are not accepted here to prevent CSRF.
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token || typeof token !== 'string')
                return next(new Error('Authentication required'));
            const payload = await (0, auth_1.verifyAccessToken)(token);
            if (!payload?.userId)
                return next(new Error('Invalid token'));
            const uid = payload.userId;
            socket.userId = uid;
            const user = await requireUser(uid);
            if (!user)
                return next(new Error('User not found'));
            socket.username = user.username;
            if (!userSockets.has(uid))
                userSockets.set(uid, new Set());
            userSockets.get(uid).add(socket.id);
            socket.join(`user:${uid}`);
            next();
        }
        catch (error) {
            logger_1.logger.warn('Socket auth failed', { message: error instanceof Error ? error.message : 'Invalid token' });
            next(new Error(error instanceof Error ? error.message : 'Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        logger_1.logger.info('Socket connected', { socketId: socket.id, userId: socket.username });
        socket.on('join:lobby', () => {
            socket.join('lobby');
            socket.emit('lobby:joined');
        });
        socket.on('join:game', async (roomId) => {
            try {
                if (typeof roomId !== 'string' || !socketAllowed(socket.id, 2)) {
                    socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many requests' });
                    return;
                }
                const game = await prisma_1.prisma.game.findUnique({
                    where: { id: roomId },
                    include: { players: true },
                });
                if (!game)
                    return socket.emit('error', { code: 'NOT_FOUND', message: 'Game not found' });
                const player = game.players.find(p => p.userId === userId);
                if (!player)
                    return socket.emit('error', { code: 'NOT_IN_GAME', message: 'You are not in this game' });
                const validPlayer = game.players.find(p => p.userId === userId);
                socket.gameId = game.id;
                socket.playerId = validPlayer.id;
                socket.join(`game:${game.id}`);
                socket.join(`player:${validPlayer.id}`);
                if (!activeGames.has(game.id))
                    activeGames.set(game.id, new Set());
                activeGames.get(game.id).add(socket);
                socket.to(`game:${game.id}`).emit('game:playerJoined', {
                    username: socket.username,
                    userId,
                    isAlive: validPlayer.isAlive,
                });
                const state = await game_service_1.CluedoEngine.getGameState(game.id, userId);
                socket.emit('game:state', state);
                (0, bot_driver_1.registerGameSocket)(`game:${game.id}`, socket);
                void (0, bot_driver_1.driveBotTurns)(io, game.id);
            }
            catch (error) {
                socket.emit('error', { code: 'JOIN_FAILED', message: error instanceof Error ? error.message : 'Failed to join game' });
            }
        });
        socket.on('leave:game', () => {
            leaveGame(socket, io);
        });
        // ---- gameplay (server-authoritative; payloads re-validated by engine) ---
        const guard = (handler) => (payload) => {
            if (!socketAllowed(socket.id)) {
                socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many actions, slow down' });
                return;
            }
            void handler(payload);
        };
        socket.on('game:roll', guard(async () => {
            try {
                const result = await withGameLock(socket, 'roll', {});
                if (result)
                    broadcastResults(io, socket, result);
            }
            catch (error) {
                socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
            }
        }));
        socket.on('game:move', guard(async (payload = {}) => {
            try {
                const parsed = validators_1.moveSchema.safeParse({ to: payload?.to });
                if (!parsed.success)
                    return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid move payload' });
                const result = await withGameLock(socket, 'move', parsed.data);
                if (result)
                    broadcastResults(io, socket, result);
            }
            catch (error) {
                socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
            }
        }));
        socket.on('game:passage', guard(async () => {
            try {
                const result = await withGameLock(socket, 'passage', {});
                if (result)
                    broadcastResults(io, socket, result);
            }
            catch (error) {
                socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
            }
        }));
        socket.on('game:suggest', guard(async (payload = {}) => {
            try {
                const parsed = validators_1.suggestSchema.safeParse(payload);
                if (!parsed.success)
                    return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid suggestion payload' });
                const result = await withGameLock(socket, 'suggest', parsed.data);
                if (result)
                    broadcastResults(io, socket, result);
            }
            catch (error) {
                socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
            }
        }));
        socket.on('game:reveal', guard(async (payload = {}) => {
            try {
                const parsed = validators_1.revealSchema.safeParse(payload);
                if (!parsed.success)
                    return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid reveal payload' });
                const result = await withGameLock(socket, 'reveal', parsed.data);
                if (result)
                    broadcastResults(io, socket, result);
            }
            catch (error) {
                socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
            }
        }));
        socket.on('game:accuse', guard(async (payload = {}) => {
            try {
                const parsed = validators_1.accuseSchema.safeParse(payload);
                if (!parsed.success)
                    return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid accusation payload' });
                const result = await withGameLock(socket, 'accuse', parsed.data);
                if (result)
                    broadcastResults(io, socket, result);
            }
            catch (error) {
                socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
            }
        }));
        socket.on('game:endTurn', guard(async () => {
            try {
                const result = await withGameLock(socket, 'endTurn', {});
                if (result)
                    broadcastResults(io, socket, result);
            }
            catch (error) {
                socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
            }
        }));
        socket.on('game:chat', guard(async (payload = {}) => {
            try {
                if (typeof payload?.content !== 'string')
                    return;
                const content = sanitizeChat(payload.content);
                if (!content)
                    return;
                const message = await prisma_1.prisma.chatMessage.create({
                    data: {
                        gameId: socket.gameId,
                        senderId: userId,
                        receiverId: typeof payload.receiverId === 'string' && payload.receiverId ? payload.receiverId : null,
                        content,
                        type: payload.receiverId ? 'PRIVATE' : 'CHAT',
                    },
                    include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
                });
                if (payload.receiverId) {
                    const receiverSockets = userSockets.get(payload.receiverId);
                    if (receiverSockets)
                        receiverSockets.forEach(sid => io.to(sid).emit('game:chatMessage', message));
                    socket.emit('game:chatMessage', message);
                }
                else {
                    io.to(`game:${socket.gameId}`).emit('game:chatMessage', message);
                }
            }
            catch (error) {
                socket.emit('error', { code: 'CHAT_FAILED', message: 'Failed to send message' });
            }
        }));
        socket.on('lobby:chat', async () => {
            // (optional lobby chat; intentionally disabled to reduce attack surface)
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('Socket disconnected', { socketId: socket.id, userId: socket.username, reason });
            socketLimits.delete(socket.id);
            if (socket.userId) {
                userSockets.get(socket.userId)?.delete(socket.id);
                if (userSockets.get(socket.userId)?.size === 0) {
                    userSockets.delete(socket.userId);
                    void prisma_1.prisma.user.update({ where: { id: socket.userId }, data: { isOnline: false, lastSeen: new Date() } }).catch(() => { });
                    io.emit('user:offline', { userId: socket.userId });
                }
            }
            if (socket.gameId) {
                activeGames.get(socket.gameId)?.delete(socket);
                if (activeGames.get(socket.gameId)?.size === 0)
                    activeGames.delete(socket.gameId);
            }
        });
    });
};
exports.setupSocketHandlers = setupSocketHandlers;
// ---- helpers ---------------------------------------------------------------
async function leaveGame(socket, _io) {
    if (!socket.gameId)
        return;
    const gameId = socket.gameId;
    socket.leave(`game:${gameId}`);
    (0, bot_driver_1.unregisterGameSocket)(`game:${gameId}`, socket);
    activeGames.get(gameId)?.delete(socket);
    socket.to(`game:${gameId}`).emit('game:playerLeft', { userId: socket.userId });
    socket.gameId = undefined;
    socket.playerId = undefined;
}
/** Serialize actions per game to avoid races; then broadcast fresh state. */
async function withGameLock(socket, action, payload) {
    if (!socket.gameId || !socket.playerId)
        return null;
    const result = await game_service_1.CluedoEngine.act(socket.gameId, socket.playerId, action, payload);
    return result;
}
function broadcastResults(io, socket, result) {
    const gameId = socket.gameId;
    for (const event of result.events) {
        const label = (0, eventLabel_1.eventLabel)(event.type, event.data);
        if (!label)
            continue;
        io.to(`game:${gameId}`).emit('game:event', {
            type: event.type,
            playerId: event.playerId,
            label,
            data: event.data,
        });
    }
    if (result.privateTo) {
        // REVEAL_REQUEST → only the player to act gets their candidate cards.
        // REVEALED_CARD → the suggester learns WHICH card defeated their theory.
        io.to(`player:${result.privateTo.playerId}`).emit(`game:${result.privateTo.event.toLowerCase()}`, result.privateTo.data);
    }
    // Broadcast per-player redacted state snapshot to everyone in the game.
    const sockets = [...(activeGames.get(gameId) || [])];
    for (const target of sockets) {
        void game_service_1.CluedoEngine.getGameState(gameId, target.userId)
            .then(state => target.emit('game:state', state))
            .catch(() => { });
    }
    void (0, bot_driver_1.driveBotTurns)(io, gameId);
}
function errorMessage(error) {
    return error instanceof Error ? error.message : 'Action failed';
}
// narrows chat payloads to safe, printable characters
function sanitizeChat(content) {
    return content.replace(/[^\p{L}\p{N}\s.,!?;:'"()[\]{}\-@#$%&*+=/<>_~`|]/gu, '').slice(0, 500);
}
//# sourceMappingURL=index.js.map