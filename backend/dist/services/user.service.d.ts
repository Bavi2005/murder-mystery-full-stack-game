import { Prisma } from '@prisma/client';
export declare class UserService {
    static getProfile(userId: string): Promise<{
        friends: {
            gameStats: {
                userId: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                gamesPlayed: number;
                gamesWon: number;
                gamesLost: number;
                totalScore: number;
                correctAccusations: number;
                wrongAccusations: number;
                cardsSeen: number;
            } | null;
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
            isOnline: boolean;
            lastSeen: Date | null;
        }[];
        gameStats: {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            gamesPlayed: number;
            gamesWon: number;
            gamesLost: number;
            totalScore: number;
            correctAccusations: number;
            wrongAccusations: number;
            cardsSeen: number;
        } | null;
        email: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        avatarUrl: string | null;
        displayName: string | null;
        isOnline: boolean;
        lastSeen: Date | null;
        sentRequests: {
            status: import(".prisma/client").$Enums.FriendRequestStatus;
            id: string;
            createdAt: Date;
            receiver: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
            };
        }[];
        receivedRequests: {
            status: import(".prisma/client").$Enums.FriendRequestStatus;
            id: string;
            createdAt: Date;
            sender: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
            };
        }[];
    }>;
    static updateProfile(userId: string, data: {
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
    }): Promise<{
        email: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        avatarUrl: string | null;
        displayName: string | null;
        isOnline: boolean;
        lastSeen: Date | null;
    }>;
    static searchUsers(query: string, currentUserId: string, limit?: number): Promise<{
        id: string;
        username: string;
        avatarUrl: string | null;
        displayName: string | null;
        isOnline: boolean;
    }[]>;
    static sendFriendRequest(userId: string, receiverId: string): Promise<{
        sender: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.FriendRequestStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        receiverId: string;
        senderId: string;
    }>;
    private static ensureNotBlocked;
    static acceptFriendRequest(userId: string, requestId: string): Promise<{
        success: boolean;
    }>;
    static rejectFriendRequest(userId: string, requestId: string): Promise<{
        success: boolean;
    }>;
    static removeFriend(userId: string, friendId: string): Promise<{
        success: boolean;
    }>;
    static getFriends(userId: string): Promise<{
        gameStats: {
            userId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            gamesPlayed: number;
            gamesWon: number;
            gamesLost: number;
            totalScore: number;
            correctAccusations: number;
            wrongAccusations: number;
            cardsSeen: number;
        } | null;
        id: string;
        username: string;
        avatarUrl: string | null;
        displayName: string | null;
        isOnline: boolean;
        lastSeen: Date | null;
    }[]>;
    static getNotifications(userId: string, unreadOnly?: boolean): Promise<{
        message: string;
        userId: string;
        id: string;
        createdAt: Date;
        data: Prisma.JsonValue;
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        isRead: boolean;
    }[]>;
    static markNotificationRead(userId: string, notificationId: string): Promise<{
        success: boolean;
    }>;
    static markAllNotificationsRead(userId: string): Promise<{
        success: boolean;
    }>;
    static getGameStats(userId: string): Promise<{
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gamesPlayed: number;
        gamesWon: number;
        gamesLost: number;
        totalScore: number;
        correctAccusations: number;
        wrongAccusations: number;
        cardsSeen: number;
    }>;
    static getLeaderboard(limit?: number): Promise<({
        user: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
        };
    } & {
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gamesPlayed: number;
        gamesWon: number;
        gamesLost: number;
        totalScore: number;
        correctAccusations: number;
        wrongAccusations: number;
        cardsSeen: number;
    })[]>;
    private static createNotification;
}
//# sourceMappingURL=user.service.d.ts.map