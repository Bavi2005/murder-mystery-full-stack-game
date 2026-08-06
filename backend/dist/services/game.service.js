"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CluedoEngine = void 0;
const prisma_1 = require("../config/prisma");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const crypto_1 = require("../utils/crypto");
const board_1 = require("../game/board");
const PASSAGES = {
    kitchen: 'study',
    study: 'kitchen',
    lounge: 'conservatory',
    conservatory: 'lounge',
};
class CluedoEngine {
    // ---- lobby / REST -------------------------------------------------------
    static async createRoom(hostId, data) {
        const botCount = Math.min(Math.max(Number((data.settings || {}).botCount) || 0, 0), data.maxPlayers - 1);
        const room = await prisma_1.prisma.game.create({
            data: {
                name: data.name.trim(),
                hostId,
                maxPlayers: data.maxPlayers,
                status: 'WAITING',
                settings: { ...(data.settings || {}), botCount },
                state: { phase: 'waiting', turnOrder: [], turnIndex: 0, dice: null, stepsRemaining: 0, moved: false, suggestedThisTurn: false, accusedThisTurn: false, pendingSuggestion: null, winnerId: null, envelopeRevealed: false },
            },
        });
        await prisma_1.prisma.gamePlayer.create({
            data: { gameId: room.id, userId: hostId, characterId: '', position: '' },
        });
        if (botCount > 0) {
            const bots = await this.ensureBotUsers(botCount);
            await prisma_1.prisma.gamePlayer.createMany({
                data: bots.map(bot => ({ gameId: room.id, userId: bot.id, characterId: '', position: '' })),
            });
            logger_1.logger.info('Bot players added to room', { roomId: room.id, botCount });
        }
        logger_1.logger.info('Room created', { roomId: room.id, hostId });
        return room;
    }
    static async ensureBotUsers(count) {
        const existing = await prisma_1.prisma.user.findMany({ where: { isBot: true } });
        const names = ['Sherlock', 'Watson', 'Poirot', 'Miss Marple', 'Holmes', 'Columbo'];
        const missing = count - existing.length;
        if (missing > 0) {
            const created = await Promise.all(Array.from({ length: missing }, (_, i) => prisma_1.prisma.user.create({
                data: {
                    email: `bot${Date.now()}${i}@mansion.ai`,
                    username: `bot_${names[(existing.length + i) % names.length].toLowerCase()}_${i}`,
                    displayName: `${names[(existing.length + i) % names.length]} (Bot)`,
                    passwordHash: `bot-${Math.random().toString(36).slice(2)}`,
                    isBot: true,
                },
            })));
            existing.push(...created);
        }
        return existing.slice(0, count);
    }
    static async listRooms(filters) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        const skip = (filters.page - 1) * filters.limit;
        const [rooms, total] = await Promise.all([
            prisma_1.prisma.game.findMany({
                where,
                skip,
                take: filters.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                    players: { select: { id: true, userId: true, isAlive: true } },
                },
            }),
            prisma_1.prisma.game.count({ where }),
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
    static async getPublicRoom(roomId) {
        const room = await prisma_1.prisma.game.findUnique({
            where: { id: roomId },
            include: {
                host: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBot: true } },
                players: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, isBot: true } } } },
            },
        });
        if (!room)
            throw new errorHandler_1.NotFoundError('Room not found');
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
    static async getRoom(roomId) {
        // Backwards-compatible alias. NEVER include `hand` in room payloads.
        return this.getPublicRoom(roomId);
    }
    static async getPrivateRoom(roomId, viewerUserId) {
        const room = await this.getPublicRoom(roomId);
        const viewer = room.players.find(p => p.userId === viewerUserId);
        if (!viewer)
            throw new errorHandler_1.NotFoundError('Not a member of this room');
        const db = await prisma_1.prisma.gamePlayer.findUnique({ where: { id: viewer.id } });
        return {
            ...room,
            myPlayerId: viewer.id,
            myCharacterId: db?.characterId ?? null,
            myHand: Array.isArray(db?.hand) ? db.hand : [],
        };
    }
    static async joinRoom(roomId, userId) {
        const room = await prisma_1.prisma.game.findUnique({ where: { id: roomId }, include: { players: true } });
        if (!room)
            throw new errorHandler_1.NotFoundError('Room not found');
        if (room.status !== 'WAITING')
            throw new errorHandler_1.ValidationError('Game already started');
        if (room.players.length >= room.maxPlayers)
            throw new errorHandler_1.ValidationError('Room is full');
        if (room.players.some(p => p.userId === userId))
            throw new errorHandler_1.ValidationError('Already in room');
        await prisma_1.prisma.gamePlayer.create({ data: { gameId: roomId, userId, characterId: '', position: '' } });
        return this.getRoom(roomId);
    }
    static async leaveRoom(roomId, userId) {
        const player = await prisma_1.prisma.gamePlayer.findFirst({ where: { gameId: roomId, userId } });
        if (!player)
            throw new errorHandler_1.NotFoundError('Not in this room');
        const room = await prisma_1.prisma.game.findUnique({ where: { id: roomId }, include: { players: { include: { user: { select: { id: true, isBot: true } } } } } });
        if (room && room.status === 'WAITING') {
            await prisma_1.prisma.gamePlayer.delete({ where: { id: player.id } });
            if (room.players.length <= 1) {
                await prisma_1.prisma.game.delete({ where: { id: roomId } });
            }
            else if (room.hostId === userId) {
                const next = room.players.find(p => p.userId !== userId && !p.user?.isBot);
                if (!next) {
                    await prisma_1.prisma.game.delete({ where: { id: roomId } });
                }
                else {
                    await prisma_1.prisma.game.update({ where: { id: roomId }, data: { hostId: next.userId } });
                }
            }
            return { success: true };
        }
        // Mid-game leave: mark as disconnected, keep the token on the board.
        if (room && room.status === 'IN_PROGRESS') {
            await prisma_1.prisma.gamePlayer.update({ where: { id: player.id }, data: { disconnected: true, leftAt: new Date() } });
            return { success: true, disconnected: true };
        }
        throw new errorHandler_1.ValidationError('Cannot leave a finished game');
    }
    static async updateRoom(hostId, data) {
        const room = await prisma_1.prisma.game.findUnique({ where: { id: data.roomId } });
        if (!room)
            throw new errorHandler_1.NotFoundError('Room not found');
        if (room.hostId !== hostId)
            throw new errorHandler_1.ValidationError('Only the host can update the room');
        if (room.status !== 'WAITING')
            throw new errorHandler_1.ValidationError('Cannot update a running game');
        const patch = {};
        if (data.name)
            patch.name = data.name.trim();
        if (data.settings)
            patch.settings = data.settings;
        if (data.settings?.maxPlayers)
            patch.maxPlayers = Number(data.settings.maxPlayers);
        await prisma_1.prisma.game.update({ where: { id: data.roomId }, data: patch });
        return this.getRoom(data.roomId);
    }
    static async sendChat(gameId, senderUserId, data) {
        const member = await prisma_1.prisma.gamePlayer.findFirst({ where: { gameId, userId: senderUserId } });
        if (!member)
            throw new errorHandler_1.ValidationError('You are not in this game');
        const content = data.content.trim().slice(0, 500);
        if (!content)
            throw new errorHandler_1.ValidationError('Message cannot be empty');
        return prisma_1.prisma.chatMessage.create({
            data: {
                gameId,
                senderId: senderUserId,
                receiverId: data.receiverId || null,
                content,
                type: data.receiverId ? 'PRIVATE' : data.type || 'CHAT',
            },
            include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        });
    }
    static async getChatHistory(gameId, userId, limit = 50) {
        const member = await prisma_1.prisma.gamePlayer.findFirst({ where: { gameId, userId } });
        if (!member)
            throw new errorHandler_1.ValidationError('You are not in this game');
        return prisma_1.prisma.chatMessage.findMany({
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
    static async startGame(roomId, hostId) {
        const room = await prisma_1.prisma.game.findUnique({ where: { id: roomId }, include: { players: { include: { user: { select: { id: true, isBot: true } } } } } });
        if (!room)
            throw new errorHandler_1.NotFoundError('Room not found');
        if (room.hostId !== hostId)
            throw new errorHandler_1.ValidationError('Only the host can start the game');
        if (room.status !== 'WAITING')
            throw new errorHandler_1.ValidationError('Game already started');
        if (room.players.length < 3 && room.players.some(p => p.user.isBot === false))
            throw new errorHandler_1.ValidationError('Need at least 3 players');
        const players = [...room.players].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
        // 1. Pick the secret envelope: 1 suspect + 1 weapon + 1 room.
        const envelope = {
            suspectId: board_1.SUSPECTS[Math.floor(Math.random() * board_1.SUSPECTS.length)].id,
            weaponId: board_1.WEAPONS[Math.floor(Math.random() * board_1.WEAPONS.length)],
            roomId: board_1.ROOMS[Math.floor(Math.random() * board_1.ROOMS.length)].id,
        };
        const encryptedEnvelope = (0, crypto_1.encryptEnvelope)(envelope);
        // 2. Deal the remaining cards round-robin.
        const deck = board_1.ALL_CARDS.filter(k => k !== envelope.suspectId && k !== envelope.weaponId && k !== envelope.roomId);
        this.shuffle(deck);
        const hands = players.map(() => []);
        deck.forEach((card, i) => hands[i % players.length].push(card));
        // 3. Assign suspect tokens + starting squares.
        const shuffledSuspects = [...board_1.SUSPECTS].sort(() => Math.random() - 0.5);
        const shuffledStarts = [...board_1.START_SQUARES].sort(() => Math.random() - 0.5);
        const state = {
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
        await prisma_1.prisma.$transaction(async (tx) => {
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
                data: { status: 'IN_PROGRESS', envelope: encryptedEnvelope, state: state, startedAt: new Date() },
            });
            await tx.gameEvent.create({
                data: {
                    gameId: roomId,
                    type: 'SYSTEM',
                    data: { message: 'The game begins. The mansion is sealed. Someone in the house is the murderer.' },
                },
            });
        });
        logger_1.logger.info('Game started', { roomId });
        return this.getRoom(roomId);
    }
    // ---- gameplay (all mutating actions go through this) --------------------
    static async act(gameId, playerId, // GamePlayer.id
    action, payload) {
        const game = await prisma_1.prisma.game.findUnique({ where: { id: gameId }, include: { players: true } });
        if (!game)
            throw new errorHandler_1.NotFoundError('Game not found');
        if (game.status !== 'IN_PROGRESS')
            throw new errorHandler_1.ValidationError('Game is not in progress');
        const me = game.players.find(p => p.id === playerId);
        if (!me)
            throw new errorHandler_1.NotFoundError('You are not in this game');
        if (!me.isAlive)
            throw new errorHandler_1.ValidationError('You have been eliminated');
        const state = (game.state || {});
        switch (action) {
            case 'roll': return this.roll(game, state, me);
            case 'move': return this.move(game, state, me, payload);
            case 'passage': return this.passage(game, state, me);
            case 'suggest': return this.suggest(game, state, me, payload);
            case 'reveal': return this.reveal(game, state, me, payload);
            case 'accuse': return this.accuse(game, state, me, payload);
            case 'endTurn': return this.endTurn(game, state, me);
            default: throw new errorHandler_1.ValidationError('Unknown action');
        }
    }
    static roll(game, state, me) {
        this.assertCurrentTurn(game, state, me);
        if (state.dice !== null)
            throw new errorHandler_1.ValidationError('You already rolled this turn');
        if (state.pendingSuggestion)
            throw new errorHandler_1.ValidationError('A suggestion is being resolved');
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const sum = d1 + d2;
        state.dice = [d1, d2];
        state.stepsRemaining = sum;
        state.moved = false;
        state.suggestedThisTurn = false;
        state.accusedThisTurn = false;
        state.pendingSuggestion = null;
        void this.persist(game, state);
        return { events: [{ type: 'ROLL', playerId: me.id, data: { d1, d2, total: sum } }] };
    }
    static move(game, state, me, payload) {
        this.assertCurrentTurn(game, state, me);
        if (state.dice === null)
            throw new errorHandler_1.ValidationError('Roll the dice first');
        if (state.stepsRemaining <= 0)
            throw new errorHandler_1.ValidationError('No steps remaining');
        if (state.pendingSuggestion)
            throw new errorHandler_1.ValidationError('A suggestion is being resolved');
        const target = String(payload?.to || '');
        if (!board_1.NODE_MAP[target])
            throw new errorHandler_1.ValidationError('Unknown destination');
        // Occupied corridor squares block movement (rooms are shared).
        const occupants = game.players.filter(p => p.isAlive && p.position === target && p.id !== me.id);
        if (occupants.length > 0 && !board_1.ROOM_IDS.includes(target))
            throw new errorHandler_1.ValidationError('That square is occupied');
        const dist = (0, board_1.distance)(me.position || '', target);
        if (dist === null || dist <= 0 || dist > state.stepsRemaining) {
            throw new errorHandler_1.ValidationError(`You cannot reach that square (${dist === null ? 'no path' : `${dist} steps needed`})`);
        }
        const prev = me.position;
        me.position = target;
        state.stepsRemaining -= dist;
        state.moved = true;
        // Entering a room ends the move.
        if (board_1.ROOM_IDS.includes(target))
            state.stepsRemaining = 0;
        void this.persist(game, state);
        return { events: [{ type: 'MOVE', playerId: me.id, data: { from: prev, to: target, stepsLeft: state.stepsRemaining } }] };
    }
    static passage(game, state, me) {
        this.assertCurrentTurn(game, state, me);
        if (state.dice === null)
            throw new errorHandler_1.ValidationError('Roll the dice first');
        const dest = PASSAGES[me.position || ''];
        if (!dest)
            throw new errorHandler_1.ValidationError('No secret passage here');
        if (state.pendingSuggestion)
            throw new errorHandler_1.ValidationError('A suggestion is being resolved');
        const prev = me.position;
        me.position = dest;
        state.stepsRemaining = 0;
        state.moved = true;
        void this.persist(game, state);
        return { events: [{ type: 'PASSAGE', playerId: me.id, data: { from: prev, to: dest } }] };
    }
    static suggest(game, state, me, payload) {
        this.assertCurrentTurn(game, state, me);
        if (state.dice === null)
            throw new errorHandler_1.ValidationError('Roll the dice first');
        if (state.suggestedThisTurn)
            throw new errorHandler_1.ValidationError('You already made a suggestion this turn');
        if (state.pendingSuggestion)
            throw new errorHandler_1.ValidationError('A suggestion is being resolved');
        if (!board_1.ROOM_IDS.includes(me.position || ''))
            throw new errorHandler_1.ValidationError('You can only suggest from inside a room');
        const suspectId = String(payload?.suspectId || '');
        const weaponId = String(payload?.weaponId || '');
        const roomId = me.position;
        if (!board_1.SUSPECTS.some(s => s.id === suspectId))
            throw new errorHandler_1.ValidationError('Unknown suspect');
        if (!board_1.WEAPONS.includes(weaponId))
            throw new errorHandler_1.ValidationError('Unknown weapon');
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
        void this.persist(game, state);
        return result;
    }
    static advanceSuggestion(game, state) {
        const s = state.pendingSuggestion;
        while (s.scanIndex < s.scanOrder.length) {
            const candidateId = s.scanOrder[s.scanIndex];
            const candidate = game.players.find(p => p.id === candidateId);
            if (!candidate || !candidate.isAlive) {
                s.scanIndex++;
                continue;
            }
            const hand = Array.isArray(candidate.hand) ? candidate.hand : [];
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
    static reveal(game, state, me, payload) {
        const s = state.pendingSuggestion;
        if (!s)
            throw new errorHandler_1.ValidationError('No suggestion awaiting a reveal');
        if (s.awaitingPlayerId !== me.id)
            throw new errorHandler_1.ValidationError('It is not your turn to reveal');
        const cardId = String(payload?.cardId || '');
        if (!s.awaitingCards.includes(cardId))
            throw new errorHandler_1.ValidationError('You cannot reveal that card');
        const hand = Array.isArray(me.hand) ? me.hand : [];
        if (!hand.includes(cardId))
            throw new errorHandler_1.ValidationError('You do not hold that card');
        s.revealedBy = me.id;
        s.revealedCardId = cardId;
        s.disproved = true;
        state.pendingSuggestion = null;
        void this.persist(game, state);
        return {
            events: [{ type: 'DISPROVE', playerId: me.id, data: { suspectId: s.suspectId, weaponId: s.weaponId, roomId: s.roomId } }],
            privateTo: { playerId: s.suggesterPlayerId, event: 'REVEALED_CARD', data: { cardId } },
        };
    }
    static accuse(game, state, me, payload) {
        this.assertCurrentTurn(game, state, me);
        if (state.dice === null)
            throw new errorHandler_1.ValidationError('Roll the dice first');
        if (state.accusedThisTurn)
            throw new errorHandler_1.ValidationError('You already accused this turn');
        if (state.pendingSuggestion)
            throw new errorHandler_1.ValidationError('A suggestion is being resolved');
        const suspectId = String(payload?.suspectId || '');
        const weaponId = String(payload?.weaponId || '');
        const roomId = String(payload?.roomId || '');
        if (!board_1.SUSPECTS.some(s => s.id === suspectId))
            throw new errorHandler_1.ValidationError('Unknown suspect');
        if (!board_1.WEAPONS.includes(weaponId))
            throw new errorHandler_1.ValidationError('Unknown weapon');
        if (!board_1.ROOMS.some(r => r.id === roomId))
            throw new errorHandler_1.ValidationError('Unknown room');
        state.accusedThisTurn = true;
        const envelope = (0, crypto_1.decryptEnvelope)(game.envelope || '');
        const correct = suspectId === envelope.suspectId && weaponId === envelope.weaponId && roomId === envelope.roomId;
        if (correct) {
            state.phase = 'finished';
            state.winnerId = me.id;
            state.envelopeRevealed = true;
            state.dice = null;
            me.score = 100;
            void this.finishGame(game, state, me.id);
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
        const result = {
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
            void this.finishGame(game, state, winner.id);
        }
        else {
            // Skip to the next alive player after the eliminated one.
            this.advanceTurnIndex(state, game);
        }
        void this.persist(game, state);
        return result;
    }
    static endTurn(game, state, me) {
        this.assertCurrentTurn(game, state, me);
        if (state.pendingSuggestion)
            throw new errorHandler_1.ValidationError('A suggestion is being resolved');
        this.advanceTurnIndex(state, game);
        state.dice = null;
        state.stepsRemaining = 0;
        state.moved = false;
        state.suggestedThisTurn = false;
        state.accusedThisTurn = false;
        void this.persist(game, state);
        return { events: [{ type: 'END_TURN', playerId: me.id, data: { nextPlayerId: state.turnOrder[state.turnIndex] } }] };
    }
    // ---- helpers ------------------------------------------------------------
    static assertCurrentTurn(game, state, me) {
        const currentPlayerId = state.turnOrder[state.turnIndex];
        if (currentPlayerId !== me.id) {
            const current = game.players.find(p => p.id === currentPlayerId);
            throw new errorHandler_1.ValidationError(`It is ${current?.user?.username || 'another player'}'s turn`);
        }
    }
    static advanceTurnIndex(state, game) {
        for (let i = 0; i < state.turnOrder.length; i++) {
            state.turnIndex = (state.turnIndex + 1) % state.turnOrder.length;
            const p = game.players.find(pl => pl.id === state.turnOrder[state.turnIndex]);
            if (p && p.isAlive)
                return;
        }
    }
    static shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
    static async persist(game, state) {
        // Persist BOTH the serialized game state AND every player mutation
        // (position, elimination, score) in one transaction. Without the player
        // updates, moves/eliminations would silently revert on the next read.
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.game.update({ where: { id: game.id }, data: { state: state } }),
            ...game.players.map(p => prisma_1.prisma.gamePlayer.update({
                where: { id: p.id },
                data: {
                    position: p.position,
                    isAlive: p.isAlive,
                    score: p.score,
                    disconnected: p.disconnected,
                },
            })),
        ]);
    }
    static async finishGame(game, state, winnerId) {
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.game.update({
                where: { id: game.id },
                data: { status: 'FINISHED', state: state, winnerId, endedAt: new Date() },
            }),
            ...game.players.map(p => prisma_1.prisma.gameStats.update({
                where: { userId: p.userId },
                data: {
                    gamesPlayed: { increment: 1 },
                    gamesWon: { increment: p.id === winnerId ? 1 : 0 },
                    gamesLost: { increment: p.id === winnerId ? 0 : 1 },
                    totalScore: { increment: p.id === winnerId ? 100 : 0 },
                },
            })),
            prisma_1.prisma.gameEvent.create({
                data: {
                    gameId: game.id,
                    type: 'WIN',
                    playerId: winnerId,
                    data: { envelope: state.envelopeRevealed ? this.envelopeOf(game) : null, winnerId },
                },
            }),
        ]);
    }
    static envelopeOf(game) {
        try {
            return (0, crypto_1.decryptEnvelope)(game.envelope || '');
        }
        catch {
            return null;
        }
    }
    // ---- read-side: per-player redacted state -------------------------------
    static async getGameState(gameId, viewerUserId) {
        const game = await prisma_1.prisma.game.findUnique({
            where: { id: gameId },
            include: {
                players: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, isBot: true } } } },
            },
        });
        if (!game)
            throw new errorHandler_1.NotFoundError('Game not found');
        const viewer = game.players.find(p => p.userId === viewerUserId);
        const state = (game.state || {});
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
        let pendingSuggestion = null;
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
    static async getEvents(gameId, limit = 60) {
        return prisma_1.prisma.gameEvent.findMany({
            where: { gameId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { player: { include: { user: { select: { username: true, displayName: true } } } } },
        });
    }
}
exports.CluedoEngine = CluedoEngine;
//# sourceMappingURL=game.service.js.map