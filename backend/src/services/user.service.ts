import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { FriendRequestStatus, NotificationType } from '../types';

const userSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isOnline: true,
  lastSeen: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class UserService {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userSelect,
        gameStats: true,
        sentRequests: {
          where: { status: 'PENDING' },
          select: { id: true, status: true, createdAt: true, receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true } } },
        },
        receivedRequests: {
          where: { status: 'PENDING' },
          select: { id: true, status: true, createdAt: true, sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true } } },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    const friends = await UserService.getFriends(userId);
    return { ...user, friends };
  }

  static async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: userSelect,
    });
    return user;
  }

  static async searchUsers(query: string, currentUserId: string, limit = 20) {
    if (!query.trim()) return [];
    return prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true },
      take: Math.min(limit, 50),
      orderBy: { isOnline: 'desc' },
    });
  }

  static async sendFriendRequest(userId: string, receiverId: string) {
    if (userId === receiverId) throw new ValidationError('Cannot add yourself');

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendRequestStatus.ACCEPTED) throw new ValidationError('Already friends');
      if (existing.status === FriendRequestStatus.PENDING) throw new ValidationError('Request already sent');
      if (existing.status === FriendRequestStatus.BLOCKED) throw new ValidationError('User blocked');
    }

    const request = await prisma.friendRequest.create({
      data: { senderId: userId, receiverId, status: FriendRequestStatus.PENDING },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });

    await this.createNotification(receiverId, {
      type: NotificationType.FRIEND_REQUEST,
      title: 'New Friend Request',
      message: `${request.sender.displayName || request.sender.username} sent you a friend request`,
      data: { requestId: request.id, senderId: userId },
    });

    return request;
  }

  private static async ensureNotBlocked(userId: string, otherId: string) {
    const blocked = await prisma.friendRequest.findFirst({
      where: { senderId: otherId, receiverId: userId, status: FriendRequestStatus.BLOCKED },
    });
    if (blocked) throw new ValidationError('Request not found');
  }

  static async acceptFriendRequest(userId: string, requestId: string) {
    const request = await prisma.friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: FriendRequestStatus.PENDING },
    });

    if (!request) throw new NotFoundError('Request not found');

    // Ensure no reverse relationship — reject any mirrored pending first.
    await prisma.friendRequest.updateMany({
      where: { senderId: userId, receiverId: request.senderId, status: FriendRequestStatus.PENDING },
      data: { status: FriendRequestStatus.REJECTED },
    });

    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: FriendRequestStatus.ACCEPTED } });

    await this.createNotification(request.senderId, {
      type: NotificationType.FRIEND_ACCEPTED,
      title: 'Friend Request Accepted',
      message: 'Your friend request was accepted',
      data: { requestId, friendId: userId },
    });

    return { success: true };
  }

  static async rejectFriendRequest(userId: string, requestId: string) {
    const request = await prisma.friendRequest.findFirst({
      where: { id: requestId, receiverId: userId, status: FriendRequestStatus.PENDING },
    });

    if (!request) throw new NotFoundError('Request not found');

    await prisma.friendRequest.update({ where: { id: requestId }, data: { status: FriendRequestStatus.REJECTED } });
    return { success: true };
  }

  static async removeFriend(userId: string, friendId: string) {
    await prisma.friendRequest.updateMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
      data: { status: FriendRequestStatus.REJECTED },
    });
    return { success: true };
  }

  static async getFriends(userId: string) {
    const links = await prisma.friendRequest.findMany({
      where: { status: FriendRequestStatus.ACCEPTED, OR: [{ senderId: userId }, { receiverId: userId }] },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true, gameStats: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true, gameStats: true } },
      },
    });
    return links.map(l => (l.senderId === userId ? l.receiver : l.sender));
  }

  static async getNotifications(userId: string, unreadOnly: boolean = false) {
    return prisma.notification.findMany({
      where: { userId, isRead: unreadOnly ? false : undefined },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markNotificationRead(userId: string, notificationId: string) {
    await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
    return { success: true };
  }

  static async markAllNotificationsRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { success: true };
  }

  static async getGameStats(userId: string) {
    const stats = await prisma.gameStats.findUnique({ where: { userId } });
    if (!stats) {
      return {
        id: userId,
        userId,
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalScore: 0,
        correctAccusations: 0,
        wrongAccusations: 0,
        cardsSeen: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return stats;
  }

  static async getLeaderboard(limit: number = 50) {
    return prisma.gameStats.findMany({
      take: limit,
      orderBy: { totalScore: 'desc' },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
  }

  private static async createNotification(userId: string, data: { type: NotificationType; title: string; message: string; data: Prisma.InputJsonValue }) {
    await prisma.notification.create({ data: { userId, ...data } });
  }
}