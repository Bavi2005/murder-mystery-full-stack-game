"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const prisma_1 = require("../config/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const types_1 = require("../types");
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
};
class UserService {
    static async getProfile(userId) {
        const user = await prisma_1.prisma.user.findUnique({
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
        if (!user)
            throw new errorHandler_1.NotFoundError('User not found');
        const friends = await UserService.getFriends(userId);
        return { ...user, friends };
    }
    static async updateProfile(userId, data) {
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data,
            select: userSelect,
        });
        return user;
    }
    static async searchUsers(query, currentUserId, limit = 20) {
        if (!query.trim())
            return [];
        return prisma_1.prisma.user.findMany({
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
    static async sendFriendRequest(userId, receiverId) {
        if (userId === receiverId)
            throw new errorHandler_1.ValidationError('Cannot add yourself');
        const existing = await prisma_1.prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId },
                    { senderId: receiverId, receiverId: userId },
                ],
            },
        });
        if (existing) {
            if (existing.status === types_1.FriendRequestStatus.ACCEPTED)
                throw new errorHandler_1.ValidationError('Already friends');
            if (existing.status === types_1.FriendRequestStatus.PENDING)
                throw new errorHandler_1.ValidationError('Request already sent');
            if (existing.status === types_1.FriendRequestStatus.BLOCKED)
                throw new errorHandler_1.ValidationError('User blocked');
        }
        const request = await prisma_1.prisma.friendRequest.create({
            data: { senderId: userId, receiverId, status: types_1.FriendRequestStatus.PENDING },
            include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        });
        await this.createNotification(receiverId, {
            type: types_1.NotificationType.FRIEND_REQUEST,
            title: 'New Friend Request',
            message: `${request.sender.displayName || request.sender.username} sent you a friend request`,
            data: { requestId: request.id, senderId: userId },
        });
        return request;
    }
    static async ensureNotBlocked(userId, otherId) {
        const blocked = await prisma_1.prisma.friendRequest.findFirst({
            where: { senderId: otherId, receiverId: userId, status: types_1.FriendRequestStatus.BLOCKED },
        });
        if (blocked)
            throw new errorHandler_1.ValidationError('Request not found');
    }
    static async acceptFriendRequest(userId, requestId) {
        const request = await prisma_1.prisma.friendRequest.findFirst({
            where: { id: requestId, receiverId: userId, status: types_1.FriendRequestStatus.PENDING },
        });
        if (!request)
            throw new errorHandler_1.NotFoundError('Request not found');
        // Ensure no reverse relationship — reject any mirrored pending first.
        await prisma_1.prisma.friendRequest.updateMany({
            where: { senderId: userId, receiverId: request.senderId, status: types_1.FriendRequestStatus.PENDING },
            data: { status: types_1.FriendRequestStatus.REJECTED },
        });
        await prisma_1.prisma.friendRequest.update({ where: { id: requestId }, data: { status: types_1.FriendRequestStatus.ACCEPTED } });
        await this.createNotification(request.senderId, {
            type: types_1.NotificationType.FRIEND_ACCEPTED,
            title: 'Friend Request Accepted',
            message: 'Your friend request was accepted',
            data: { requestId, friendId: userId },
        });
        return { success: true };
    }
    static async rejectFriendRequest(userId, requestId) {
        const request = await prisma_1.prisma.friendRequest.findFirst({
            where: { id: requestId, receiverId: userId, status: types_1.FriendRequestStatus.PENDING },
        });
        if (!request)
            throw new errorHandler_1.NotFoundError('Request not found');
        await prisma_1.prisma.friendRequest.update({ where: { id: requestId }, data: { status: types_1.FriendRequestStatus.REJECTED } });
        return { success: true };
    }
    static async removeFriend(userId, friendId) {
        await prisma_1.prisma.friendRequest.updateMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId },
                ],
            },
            data: { status: types_1.FriendRequestStatus.REJECTED },
        });
        return { success: true };
    }
    static async getFriends(userId) {
        const links = await prisma_1.prisma.friendRequest.findMany({
            where: { status: types_1.FriendRequestStatus.ACCEPTED, OR: [{ senderId: userId }, { receiverId: userId }] },
            include: {
                sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true, gameStats: true } },
                receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true, gameStats: true } },
            },
        });
        return links.map(l => (l.senderId === userId ? l.receiver : l.sender));
    }
    static async getNotifications(userId, unreadOnly = false) {
        return prisma_1.prisma.notification.findMany({
            where: { userId, isRead: unreadOnly ? false : undefined },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    static async markNotificationRead(userId, notificationId) {
        await prisma_1.prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
        return { success: true };
    }
    static async markAllNotificationsRead(userId) {
        await prisma_1.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
        return { success: true };
    }
    static async getGameStats(userId) {
        const stats = await prisma_1.prisma.gameStats.findUnique({ where: { userId } });
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
    static async getLeaderboard(limit = 50) {
        return prisma_1.prisma.gameStats.findMany({
            take: limit,
            orderBy: { totalScore: 'desc' },
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        });
    }
    static async createNotification(userId, data) {
        await prisma_1.prisma.notification.create({ data: { userId, ...data } });
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map