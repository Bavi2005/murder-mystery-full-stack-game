import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { CluedoEngine } from '../services/game.service';
import { prisma } from '../config/prisma';
import { CreateRoomInput, ListRoomsInput, UpdateRoomInput, MoveInput, SuggestInput, RevealInput, AccuseInput, ChatInput } from '../validators';

// Resolve a user's GamePlayer id for this room (server-side, never client-supplied).
async function resolvePlayerId(roomId: string, userId: string): Promise<string> {
  const player = await prisma.gamePlayer.findFirst({ where: { gameId: roomId, userId }, select: { id: true } });
  if (!player) {
    const err = new Error('You are not in this game') as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }
  return player.id;
}

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const data: CreateRoomInput = req.body;
  const room = await CluedoEngine.createRoom(req.user!.userId, data);
  res.status(201).json({ success: true, data: room });
});

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  const data = req.query as unknown as ListRoomsInput;
  const result = await CluedoEngine.listRooms({
    page: Number(data.page || 1),
    limit: Number(data.limit || 20),
    status: data.status,
  });
  res.json({ success: true, data: result.rooms, meta: result.meta });
});

export const getRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await CluedoEngine.getRoom(req.params.roomId);
  res.json({ success: true, data: room });
});

export const joinRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await CluedoEngine.joinRoom(req.params.roomId, req.user!.userId);
  res.json({ success: true, data: room });
});

export const leaveRoom = asyncHandler(async (req: Request, res: Response) => {
  const result = await CluedoEngine.leaveRoom(req.params.roomId, req.user!.userId);
  res.json({ success: true, data: result });
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const data: UpdateRoomInput = { roomId: req.params.roomId, ...req.body };
  const room = await CluedoEngine.updateRoom(req.user!.userId, data);
  res.json({ success: true, data: room });
});

export const startGame = asyncHandler(async (req: Request, res: Response) => {
  const room = await CluedoEngine.startGame(req.params.roomId, req.user!.userId);
  res.json({ success: true, data: room });
});

export const getGameState = asyncHandler(async (req: Request, res: Response) => {
  const state = await CluedoEngine.getGameState(req.params.roomId, req.user!.userId);
  res.json({ success: true, data: state });
});

export const getGameEvents = asyncHandler(async (req: Request, res: Response) => {
  const events = await CluedoEngine.getEvents(req.params.roomId);
  res.json({ success: true, data: events });
});

// REST fallbacks for the same server-authoritative actions as the socket layer.
export const rollDice = asyncHandler(async (req: Request, res: Response) => {
  const playerId = await resolvePlayerId(req.params.roomId, req.user!.userId);
  const result = await CluedoEngine.act(req.params.roomId, playerId, 'roll', {});
  res.json({ success: true, data: result });
});

export const movePlayer = asyncHandler(async (req: Request, res: Response) => {
  const data: MoveInput = req.body;
  const playerId = await resolvePlayerId(req.params.roomId, req.user!.userId);
  const result = await CluedoEngine.act(req.params.roomId, playerId, 'move', data);
  res.json({ success: true, data: result });
});

export const suggest = asyncHandler(async (req: Request, res: Response) => {
  const data: SuggestInput = req.body;
  const playerId = await resolvePlayerId(req.params.roomId, req.user!.userId);
  const result = await CluedoEngine.act(req.params.roomId, playerId, 'suggest', data);
  res.json({ success: true, data: result });
});

export const reveal = asyncHandler(async (req: Request, res: Response) => {
  const data: RevealInput = req.body;
  const playerId = await resolvePlayerId(req.params.roomId, req.user!.userId);
  const result = await CluedoEngine.act(req.params.roomId, playerId, 'reveal', data);
  res.json({ success: true, data: result });
});

export const accuse = asyncHandler(async (req: Request, res: Response) => {
  const data: AccuseInput = req.body;
  const playerId = await resolvePlayerId(req.params.roomId, req.user!.userId);
  const result = await CluedoEngine.act(req.params.roomId, playerId, 'accuse', data);
  res.json({ success: true, data: result });
});

export const endTurn = asyncHandler(async (req: Request, res: Response) => {
  const playerId = await resolvePlayerId(req.params.roomId, req.user!.userId);
  const result = await CluedoEngine.act(req.params.roomId, playerId, 'endTurn', {});
  res.json({ success: true, data: result });
});

export const sendChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const data: ChatInput = req.body;
  const message = await CluedoEngine.sendChat(req.params.roomId, req.user!.userId, data);
  res.json({ success: true, data: message });
});

export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const messages = await CluedoEngine.getChatHistory(req.params.roomId, req.user!.userId, limit);
  res.json({ success: true, data: messages });
});
