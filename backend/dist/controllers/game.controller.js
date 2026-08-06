"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatHistory = exports.sendChatMessage = exports.endTurn = exports.accuse = exports.reveal = exports.suggest = exports.movePlayer = exports.rollDice = exports.getGameEvents = exports.getGameState = exports.startGame = exports.updateRoom = exports.leaveRoom = exports.joinRoom = exports.getRoom = exports.listRooms = exports.createRoom = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const game_service_1 = require("../services/game.service");
const prisma_1 = require("../config/prisma");
// Resolve a user's GamePlayer id for this room (server-side, never client-supplied).
async function resolvePlayerId(roomId, userId) {
    const player = await prisma_1.prisma.gamePlayer.findFirst({ where: { gameId: roomId, userId }, select: { id: true } });
    if (!player) {
        const err = new Error('You are not in this game');
        err.statusCode = 403;
        throw err;
    }
    return player.id;
}
exports.createRoom = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.body;
    const room = await game_service_1.CluedoEngine.createRoom(req.user.userId, data);
    res.status(201).json({ success: true, data: room });
});
exports.listRooms = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.query;
    const result = await game_service_1.CluedoEngine.listRooms({
        page: Number(data.page || 1),
        limit: Number(data.limit || 20),
        status: data.status,
    });
    res.json({ success: true, data: result.rooms, meta: result.meta });
});
exports.getRoom = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const room = await game_service_1.CluedoEngine.getRoom(req.params.roomId);
    res.json({ success: true, data: room });
});
exports.joinRoom = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const room = await game_service_1.CluedoEngine.joinRoom(req.params.roomId, req.user.userId);
    res.json({ success: true, data: room });
});
exports.leaveRoom = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await game_service_1.CluedoEngine.leaveRoom(req.params.roomId, req.user.userId);
    res.json({ success: true, data: result });
});
exports.updateRoom = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = { roomId: req.params.roomId, ...req.body };
    const room = await game_service_1.CluedoEngine.updateRoom(req.user.userId, data);
    res.json({ success: true, data: room });
});
exports.startGame = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const room = await game_service_1.CluedoEngine.startGame(req.params.roomId, req.user.userId);
    res.json({ success: true, data: room });
});
exports.getGameState = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const state = await game_service_1.CluedoEngine.getGameState(req.params.roomId, req.user.userId);
    res.json({ success: true, data: state });
});
exports.getGameEvents = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const events = await game_service_1.CluedoEngine.getEvents(req.params.roomId);
    res.json({ success: true, data: events });
});
// REST fallbacks for the same server-authoritative actions as the socket layer.
exports.rollDice = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const playerId = await resolvePlayerId(req.params.roomId, req.user.userId);
    const result = await game_service_1.CluedoEngine.act(req.params.roomId, playerId, 'roll', {});
    res.json({ success: true, data: result });
});
exports.movePlayer = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.body;
    const playerId = await resolvePlayerId(req.params.roomId, req.user.userId);
    const result = await game_service_1.CluedoEngine.act(req.params.roomId, playerId, 'move', data);
    res.json({ success: true, data: result });
});
exports.suggest = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.body;
    const playerId = await resolvePlayerId(req.params.roomId, req.user.userId);
    const result = await game_service_1.CluedoEngine.act(req.params.roomId, playerId, 'suggest', data);
    res.json({ success: true, data: result });
});
exports.reveal = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.body;
    const playerId = await resolvePlayerId(req.params.roomId, req.user.userId);
    const result = await game_service_1.CluedoEngine.act(req.params.roomId, playerId, 'reveal', data);
    res.json({ success: true, data: result });
});
exports.accuse = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.body;
    const playerId = await resolvePlayerId(req.params.roomId, req.user.userId);
    const result = await game_service_1.CluedoEngine.act(req.params.roomId, playerId, 'accuse', data);
    res.json({ success: true, data: result });
});
exports.endTurn = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const playerId = await resolvePlayerId(req.params.roomId, req.user.userId);
    const result = await game_service_1.CluedoEngine.act(req.params.roomId, playerId, 'endTurn', {});
    res.json({ success: true, data: result });
});
exports.sendChatMessage = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = req.body;
    const message = await game_service_1.CluedoEngine.sendChat(req.params.roomId, req.user.userId, data);
    res.json({ success: true, data: message });
});
exports.getChatHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const messages = await game_service_1.CluedoEngine.getChatHistory(req.params.roomId, req.user.userId, limit);
    res.json({ success: true, data: messages });
});
//# sourceMappingURL=game.controller.js.map