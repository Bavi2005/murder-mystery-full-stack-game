"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const game_controller_1 = require("../controllers/game.controller");
const validators_1 = require("../validators");
exports.gameRouter = (0, express_1.Router)();
exports.gameRouter.use(auth_1.authenticate);
exports.gameRouter.post('/rooms', (0, validation_1.validate)(validators_1.createRoomSchema), game_controller_1.createRoom);
exports.gameRouter.get('/rooms', (0, validation_1.validate)(validators_1.listRoomsSchema), game_controller_1.listRooms);
exports.gameRouter.get('/rooms/:roomId', game_controller_1.getRoom);
exports.gameRouter.post('/rooms/:roomId/join', (0, validation_1.validate)(validators_1.joinRoomSchema), game_controller_1.joinRoom);
exports.gameRouter.post('/rooms/:roomId/leave', game_controller_1.leaveRoom);
exports.gameRouter.put('/rooms/:roomId', (0, validation_1.validate)(validators_1.updateRoomSchema), game_controller_1.updateRoom);
exports.gameRouter.post('/rooms/:roomId/start', game_controller_1.startGame);
exports.gameRouter.get('/rooms/:roomId/state', game_controller_1.getGameState);
exports.gameRouter.get('/rooms/:roomId/events', game_controller_1.getGameEvents);
// Gameplay (also available over sockets; REST kept for parity & debugging)
exports.gameRouter.post('/rooms/:roomId/roll', game_controller_1.rollDice);
exports.gameRouter.post('/rooms/:roomId/move', (0, validation_1.validate)(validators_1.moveSchema), game_controller_1.movePlayer);
exports.gameRouter.post('/rooms/:roomId/suggest', (0, validation_1.validate)(validators_1.suggestSchema), game_controller_1.suggest);
exports.gameRouter.post('/rooms/:roomId/reveal', (0, validation_1.validate)(validators_1.revealSchema), game_controller_1.reveal);
exports.gameRouter.post('/rooms/:roomId/accuse', (0, validation_1.validate)(validators_1.accuseSchema), game_controller_1.accuse);
exports.gameRouter.post('/rooms/:roomId/end-turn', game_controller_1.endTurn);
exports.gameRouter.post('/rooms/:roomId/chat', (0, validation_1.validate)(validators_1.chatSchema), game_controller_1.sendChatMessage);
exports.gameRouter.get('/rooms/:roomId/chat', game_controller_1.getChatHistory);
//# sourceMappingURL=game.routes.js.map