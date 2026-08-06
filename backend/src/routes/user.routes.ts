import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { getProfile, updateProfile, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, getFriends, getNotifications, markNotificationRead, markAllNotificationsRead, searchUsers, getLeaderboard, getGameStats } from '../controllers/user.controller';
import { friendRequestSchema, friendActionSchema, notificationSchema } from '../validators';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/profile', getProfile);
userRouter.put('/profile', updateProfile);
userRouter.get('/stats', getGameStats);

userRouter.post('/friends/request', validate(friendRequestSchema), sendFriendRequest);
userRouter.post('/friends/:requestId/accept', validate(friendActionSchema), acceptFriendRequest);
userRouter.post('/friends/:requestId/reject', validate(friendActionSchema), rejectFriendRequest);
userRouter.delete('/friends/:friendId', removeFriend);
userRouter.get('/friends', getFriends);

userRouter.get('/notifications', getNotifications);
userRouter.post('/notifications/:notificationId/read', validate(notificationSchema), markNotificationRead);
userRouter.post('/notifications/read-all', markAllNotificationsRead);

userRouter.get('/search', searchUsers);
userRouter.get('/leaderboard', getLeaderboard);