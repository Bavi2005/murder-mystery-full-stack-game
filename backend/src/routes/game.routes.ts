import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createRoom, listRooms, getRoom, joinRoom, leaveRoom, updateRoom, startGame,
  getGameState, getGameEvents,
  rollDice, movePlayer, suggest, reveal, accuse, endTurn,
  sendChatMessage, getChatHistory,
} from '../controllers/game.controller';
import {
  createRoomSchema, joinRoomSchema, listRoomsSchema, updateRoomSchema,
  moveSchema, suggestSchema, revealSchema, accuseSchema, chatSchema,
} from '../validators';

export const gameRouter = Router();

gameRouter.use(authenticate);

gameRouter.post('/rooms', validate(createRoomSchema), createRoom);
gameRouter.get('/rooms', validate(listRoomsSchema), listRooms);
gameRouter.get('/rooms/:roomId', getRoom);
gameRouter.post('/rooms/:roomId/join', validate(joinRoomSchema), joinRoom);
gameRouter.post('/rooms/:roomId/leave', leaveRoom);
gameRouter.put('/rooms/:roomId', validate(updateRoomSchema), updateRoom);
gameRouter.post('/rooms/:roomId/start', startGame);
gameRouter.get('/rooms/:roomId/state', getGameState);
gameRouter.get('/rooms/:roomId/events', getGameEvents);

// Gameplay (also available over sockets; REST kept for parity & debugging)
gameRouter.post('/rooms/:roomId/roll', rollDice);
gameRouter.post('/rooms/:roomId/move', validate(moveSchema), movePlayer);
gameRouter.post('/rooms/:roomId/suggest', validate(suggestSchema), suggest);
gameRouter.post('/rooms/:roomId/reveal', validate(revealSchema), reveal);
gameRouter.post('/rooms/:roomId/accuse', validate(accuseSchema), accuse);
gameRouter.post('/rooms/:roomId/end-turn', endTurn);

gameRouter.post('/rooms/:roomId/chat', validate(chatSchema), sendChatMessage);
gameRouter.get('/rooms/:roomId/chat', getChatHistory);