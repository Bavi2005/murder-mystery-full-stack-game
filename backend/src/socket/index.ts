import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { CluedoEngine, EngineResult } from '../services/game.service';
import { eventLabel } from '../game/eventLabel';
import { moveSchema, suggestSchema, revealSchema, accuseSchema } from '../validators';
import { driveBotTurns, registerGameSocket, unregisterGameSocket } from '../services/bot.driver';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  gameId?: string;
  playerId?: string;
}

const userSockets = new Map<string, Set<string>>();
const activeGames = new Map<string, Set<AuthenticatedSocket>>();

// Per-socket action rate limiter (token bucket). Guards against spamming
// game actions over the socket to busy-loop the engine.
const socketLimits = new Map<string, { tokens: number; lastRefill: number }>();
const SOCKET_LIMIT_MAX = 30;
const SOCKET_LIMIT_REFILL_MS = 60_000;

function socketAllowed(socketId: string, cost = 1): boolean {
  const now = Date.now();
  const entry = socketLimits.get(socketId) || { tokens: SOCKET_LIMIT_MAX, lastRefill: now };
  entry.tokens = Math.min(SOCKET_LIMIT_MAX, entry.tokens + ((now - entry.lastRefill) / SOCKET_LIMIT_REFILL_MS) * SOCKET_LIMIT_MAX);
  entry.lastRefill = now;
  if (entry.tokens < cost) return false;
  entry.tokens -= cost;
  socketLimits.set(socketId, entry);
  if (socketLimits.size > 5000) {
    const entries = [...socketLimits.entries()].reverse().slice(0, 4000);
    socketLimits.clear();
    entries.forEach(([k, v]) => socketLimits.set(k, v));
  }
  return true;
}

async function requireUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true },
  });
}

export const setupSocketHandlers = (io: Server) => {
  // ---- authn middleware ----------------------------------------------------
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Socket.io handshake `auth.token` — require a valid access token, NOT
      // the refresh token. Cookies are not accepted here to prevent CSRF.
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') return next(new Error('Authentication required'));

      const payload = await verifyAccessToken(token);
      if (!payload?.userId) return next(new Error('Invalid token'));

      const uid: string = payload.userId;
      socket.userId = uid;

      const user = await requireUser(uid);
      if (!user) return next(new Error('User not found'));
      socket.username = user.username;

      if (!userSockets.has(uid)) userSockets.set(uid, new Set());
      userSockets.get(uid)!.add(socket.id);
      socket.join(`user:${uid}`);

      next();
    } catch (error: unknown) {
      logger.warn('Socket auth failed', { message: error instanceof Error ? error.message : 'Invalid token' });
      next(new Error(error instanceof Error ? error.message : 'Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info('Socket connected', { socketId: socket.id, userId: socket.username });

    socket.on('join:lobby', () => {
      socket.join('lobby');
      socket.emit('lobby:joined');
    });

    socket.on('join:game', async (roomId: string) => {
      try {
        if (typeof roomId !== 'string' || !socketAllowed(socket.id, 2)) {
          socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many requests' });
          return;
        }
        const game = await prisma.game.findUnique({
          where: { id: roomId },
          include: { players: true },
        });
        if (!game) return socket.emit('error', { code: 'NOT_FOUND', message: 'Game not found' });

        const player = game.players.find(p => p.userId === userId);
        if (!player) return socket.emit('error', { code: 'NOT_IN_GAME', message: 'You are not in this game' });

        const validPlayer = game.players.find(p => p.userId === userId);

        socket.gameId = game.id;
        socket.playerId = validPlayer!.id;
        socket.join(`game:${game.id}`);
        socket.join(`player:${validPlayer!.id}`);

        if (!activeGames.has(game.id)) activeGames.set(game.id, new Set());
        activeGames.get(game.id)!.add(socket);

        socket.to(`game:${game.id}`).emit('game:playerJoined', {
          username: socket.username,
          userId,
          isAlive: validPlayer!.isAlive,
        });

        const state = await CluedoEngine.getGameState(game.id, userId);
        socket.emit('game:state', state);
        registerGameSocket(`game:${game.id}`, socket);
        void driveBotTurns(io, game.id);
      } catch (error) {
        socket.emit('error', { code: 'JOIN_FAILED', message: error instanceof Error ? error.message : 'Failed to join game' });
      }
    });

    socket.on('leave:game', () => {
      leaveGame(socket, io);
    });

    // ---- gameplay (server-authoritative; payloads re-validated by engine) ---
    const guard = <P = unknown>(handler: (payload?: P) => void) => (payload?: P) => {
      if (!socketAllowed(socket.id)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: 'Too many actions, slow down' });
        return;
      }
      void handler(payload);
    };

    socket.on('game:roll', guard(async () => {
      try {
        const result = await withGameLock(socket, 'roll', {});
        if (result) broadcastResults(io, socket, result);
      } catch (error) {
        socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
      }
    }));

    socket.on('game:move', guard(async (payload: { to?: string } = {}) => {
      try {
        const parsed = moveSchema.safeParse({ to: payload?.to });
        if (!parsed.success) return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid move payload' });
        const result = await withGameLock(socket, 'move', parsed.data);
        if (result) broadcastResults(io, socket, result);
      } catch (error) {
        socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
      }
    }));

    socket.on('game:passage', guard(async () => {
      try {
        const result = await withGameLock(socket, 'passage', {});
        if (result) broadcastResults(io, socket, result);
      } catch (error) {
        socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
      }
    }));

    socket.on('game:suggest', guard(async (payload: { suspectId?: string; weaponId?: string } = {}) => {
      try {
        const parsed = suggestSchema.safeParse(payload);
        if (!parsed.success) return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid suggestion payload' });
        const result = await withGameLock(socket, 'suggest', parsed.data);
        if (result) broadcastResults(io, socket, result);
      } catch (error) {
        socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
      }
    }));

    socket.on('game:reveal', guard(async (payload: { cardId?: string } = {}) => {
      try {
        const parsed = revealSchema.safeParse(payload);
        if (!parsed.success) return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid reveal payload' });
        const result = await withGameLock(socket, 'reveal', parsed.data);
        if (result) broadcastResults(io, socket, result);
      } catch (error) {
        socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
      }
    }));

    socket.on('game:accuse', guard(async (payload: { suspectId?: string; weaponId?: string; roomId?: string } = {}) => {
      try {
        const parsed = accuseSchema.safeParse(payload);
        if (!parsed.success) return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid accusation payload' });
        const result = await withGameLock(socket, 'accuse', parsed.data);
        if (result) broadcastResults(io, socket, result);
      } catch (error) {
        socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
      }
    }));

    socket.on('game:endTurn', guard(async () => {
      try {
        const result = await withGameLock(socket, 'endTurn', {});
        if (result) broadcastResults(io, socket, result);
      } catch (error) {
        socket.emit('error', { code: 'ACTION_FAILED', message: errorMessage(error) });
      }
    }));

    socket.on('game:chat', guard(async (payload: { content?: string; receiverId?: string } = {}) => {
      try {
        if (typeof payload?.content !== 'string') return;
        const content = sanitizeChat(payload.content);
        if (!content) return;

        const message = await prisma.chatMessage.create({
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
          if (receiverSockets) receiverSockets.forEach(sid => io.to(sid).emit('game:chatMessage', message));
          socket.emit('game:chatMessage', message);
        } else {
          io.to(`game:${socket.gameId}`).emit('game:chatMessage', message);
        }
      } catch (error) {
        socket.emit('error', { code: 'CHAT_FAILED', message: 'Failed to send message' });
      }
    }));

    socket.on('lobby:chat', async () => {
      // (optional lobby chat; intentionally disabled to reduce attack surface)
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, userId: socket.username, reason });
      socketLimits.delete(socket.id);

      if (socket.userId) {
        userSockets.get(socket.userId)?.delete(socket.id);
        if (userSockets.get(socket.userId)?.size === 0) {
          userSockets.delete(socket.userId);
          void prisma.user.update({ where: { id: socket.userId }, data: { isOnline: false, lastSeen: new Date() } }).catch(() => {});
          io.emit('user:offline', { userId: socket.userId });
        }
      }
      if (socket.gameId) {
        activeGames.get(socket.gameId)?.delete(socket);
        if (activeGames.get(socket.gameId)?.size === 0) activeGames.delete(socket.gameId);
      }
    });
  });
};

// ---- helpers ---------------------------------------------------------------

async function leaveGame(socket: AuthenticatedSocket, _io: Server) {
  if (!socket.gameId) return;
  const gameId = socket.gameId;
  socket.leave(`game:${gameId}`);
  unregisterGameSocket(`game:${gameId}`, socket);
  activeGames.get(gameId)?.delete(socket);
  socket.to(`game:${gameId}`).emit('game:playerLeft', { userId: socket.userId });
  socket.gameId = undefined;
  socket.playerId = undefined;
}

/** Serialize actions per game to avoid races; then broadcast fresh state. */
async function withGameLock(
  socket: AuthenticatedSocket,
  action: 'roll' | 'move' | 'passage' | 'suggest' | 'reveal' | 'accuse' | 'endTurn',
  payload: Record<string, unknown>
) {
  if (!socket.gameId || !socket.playerId) return null;
  const result = await CluedoEngine.act(socket.gameId, socket.playerId, action, payload);
  return result;
}

function broadcastResults(io: Server, socket: AuthenticatedSocket, result: EngineResult) {
  const gameId = socket.gameId!;

  for (const event of result.events) {
    const label = eventLabel(event.type, event.data);
    if (!label) continue;
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
    void CluedoEngine.getGameState(gameId, target.userId!)
      .then(state => target.emit('game:state', state))
      .catch(() => {});
  }

  void driveBotTurns(io, gameId);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Action failed';
}

// narrows chat payloads to safe, printable characters
function sanitizeChat(content: string): string {
  return content.replace(/[^\p{L}\p{N}\s.,!?;:'"()[\]{}\-@#$%&*+=/<>_~`|]/gu, '').slice(0, 500);
}