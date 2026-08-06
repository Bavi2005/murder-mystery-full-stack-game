import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { UserService } from '../services/user.service';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await UserService.getProfile(req.user!.userId);
  res.json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body;
  const profile = await UserService.updateProfile(req.user!.userId, data);
  res.json({ success: true, data: profile });
});

export const sendFriendRequest = asyncHandler(async (req: Request, res: Response) => {
  const { receiverId } = req.body;
  const request = await UserService.sendFriendRequest(req.user!.userId, receiverId);
  res.status(201).json({ success: true, data: request });
});

export const acceptFriendRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const result = await UserService.acceptFriendRequest(req.user!.userId, requestId);
  res.json({ success: true, data: result });
});

export const rejectFriendRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const result = await UserService.rejectFriendRequest(req.user!.userId, requestId);
  res.json({ success: true, data: result });
});

export const removeFriend = asyncHandler(async (req: Request, res: Response) => {
  const { friendId } = req.params;
  const result = await UserService.removeFriend(req.user!.userId, friendId);
  res.json({ success: true, data: result });
});

export const getFriends = asyncHandler(async (req: Request, res: Response) => {
  const friends = await UserService.getFriends(req.user!.userId);
  res.json({ success: true, data: friends });
});

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const unreadOnly = req.query.unread === 'true';
  const notifications = await UserService.getNotifications(req.user!.userId, unreadOnly);
  res.json({ success: true, data: notifications });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  await UserService.markNotificationRead(req.user!.userId, notificationId);
  res.json({ success: true, data: { message: 'Marked as read' } });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await UserService.markAllNotificationsRead(req.user!.userId);
  res.json({ success: true, data: { message: 'All marked as read' } });
});

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string || '';
  const users = await UserService.searchUsers(query, req.user!.userId);
  res.json({ success: true, data: users });
});

export const getGameStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await UserService.getGameStats(req.user!.userId);
  res.json({ success: true, data: stats });
});

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const leaderboard = await UserService.getLeaderboard(limit);
  res.json({ success: true, data: leaderboard });
});