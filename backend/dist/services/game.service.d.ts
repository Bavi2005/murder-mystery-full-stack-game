import { Prisma } from '@prisma/client';
export interface GamePhaseState {
    phase: 'waiting' | 'playing' | 'finished';
    turnOrder: string[];
    turnIndex: number;
    dice: [number, number] | null;
    stepsRemaining: number;
    moved: boolean;
    suggestedThisTurn: boolean;
    accusedThisTurn: boolean;
    pendingSuggestion: PendingSuggestion | null;
    winnerId: string | null;
    envelopeRevealed: boolean;
}
export interface PendingSuggestion {
    suggesterPlayerId: string;
    suspectId: string;
    weaponId: string;
    roomId: string;
    scanOrder: string[];
    scanIndex: number;
    awaitingPlayerId: string | null;
    awaitingCards: string[];
    revealedBy: string | null;
    revealedCardId: string | null;
    disproved: boolean;
}
export interface Envelope {
    suspectId: string;
    weaponId: string;
    roomId: string;
}
export interface EngineEvent {
    type: 'ROLL' | 'MOVE' | 'PASSAGE' | 'SUGGEST' | 'DISPROVE' | 'NO_DISPROVE' | 'ACCUSE' | 'ELIMINATE' | 'WIN' | 'END_TURN' | 'SYSTEM';
    playerId?: string | null;
    data: Record<string, unknown>;
}
export interface EngineResult {
    events: EngineEvent[];
    privateTo?: {
        playerId: string;
        event: 'REVEAL_REQUEST' | 'REVEALED_CARD';
        data: Record<string, unknown>;
    };
    gameOver?: boolean;
}
export declare class CluedoEngine {
    static createRoom(hostId: string, data: {
        name: string;
        maxPlayers: number;
        settings?: Record<string, unknown>;
    }): Promise<{
        status: import(".prisma/client").$Enums.GameStatus;
        id: string;
        createdAt: Date;
        name: string;
        hostId: string;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        envelope: string | null;
        state: Prisma.JsonValue;
        winnerId: string | null;
        updatedAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static ensureBotUsers(count: number): Promise<{
        email: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        passwordHash: string;
        avatarUrl: string | null;
        displayName: string | null;
        bio: string | null;
        isOnline: boolean;
        isBot: boolean;
        lastSeen: Date | null;
        twoFactorEnabled: boolean;
        twoFactorSecret: string | null;
        failedLoginAttempts: number;
    }[]>;
    static listRooms(filters: {
        page: number;
        limit: number;
        status?: string;
    }): Promise<{
        rooms: {
            currentPlayers: number;
            players: undefined;
            host: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
            };
            status: import(".prisma/client").$Enums.GameStatus;
            id: string;
            createdAt: Date;
            name: string;
            hostId: string;
            maxPlayers: number;
            settings: Prisma.JsonValue;
            envelope: string | null;
            state: Prisma.JsonValue;
            winnerId: string | null;
            updatedAt: Date;
            startedAt: Date | null;
            endedAt: Date | null;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getPublicRoom(roomId: string): Promise<{
        players: {
            id: string;
            gameId: string;
            userId: string;
            characterId: string;
            position: string;
            isAlive: boolean;
            disconnected: boolean;
            score: number;
            joinedAt: Date;
            user: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
                isBot: boolean;
            };
        }[];
        host: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
            isBot: boolean;
        };
        status: import(".prisma/client").$Enums.GameStatus;
        id: string;
        createdAt: Date;
        name: string;
        hostId: string;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        winnerId: string | null;
        updatedAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static getRoom(roomId: string): Promise<{
        players: {
            id: string;
            gameId: string;
            userId: string;
            characterId: string;
            position: string;
            isAlive: boolean;
            disconnected: boolean;
            score: number;
            joinedAt: Date;
            user: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
                isBot: boolean;
            };
        }[];
        host: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
            isBot: boolean;
        };
        status: import(".prisma/client").$Enums.GameStatus;
        id: string;
        createdAt: Date;
        name: string;
        hostId: string;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        winnerId: string | null;
        updatedAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static getPrivateRoom(roomId: string, viewerUserId: string): Promise<{
        myPlayerId: string;
        myCharacterId: string | null;
        myHand: string[];
        players: {
            id: string;
            gameId: string;
            userId: string;
            characterId: string;
            position: string;
            isAlive: boolean;
            disconnected: boolean;
            score: number;
            joinedAt: Date;
            user: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
                isBot: boolean;
            };
        }[];
        host: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
            isBot: boolean;
        };
        status: import(".prisma/client").$Enums.GameStatus;
        id: string;
        createdAt: Date;
        name: string;
        hostId: string;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        winnerId: string | null;
        updatedAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static joinRoom(roomId: string, userId: string): Promise<{
        players: {
            id: string;
            gameId: string;
            userId: string;
            characterId: string;
            position: string;
            isAlive: boolean;
            disconnected: boolean;
            score: number;
            joinedAt: Date;
            user: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
                isBot: boolean;
            };
        }[];
        host: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
            isBot: boolean;
        };
        status: import(".prisma/client").$Enums.GameStatus;
        id: string;
        createdAt: Date;
        name: string;
        hostId: string;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        winnerId: string | null;
        updatedAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static leaveRoom(roomId: string, userId: string): Promise<{
        success: boolean;
        disconnected?: undefined;
    } | {
        success: boolean;
        disconnected: boolean;
    }>;
    static updateRoom(hostId: string, data: {
        roomId: string;
        name?: string;
        settings?: Record<string, unknown>;
    }): Promise<{
        players: {
            id: string;
            gameId: string;
            userId: string;
            characterId: string;
            position: string;
            isAlive: boolean;
            disconnected: boolean;
            score: number;
            joinedAt: Date;
            user: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
                isBot: boolean;
            };
        }[];
        host: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
            isBot: boolean;
        };
        status: import(".prisma/client").$Enums.GameStatus;
        id: string;
        createdAt: Date;
        name: string;
        hostId: string;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        winnerId: string | null;
        updatedAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static sendChat(gameId: string, senderUserId: string, data: {
        content: string;
        type?: string;
        receiverId?: string;
    }): Promise<{
        sender: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        gameId: string | null;
        receiverId: string | null;
        content: string;
        type: import(".prisma/client").$Enums.MessageType;
        senderId: string;
    }>;
    static getChatHistory(gameId: string, userId: string, limit?: number): Promise<({
        sender: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        gameId: string | null;
        receiverId: string | null;
        content: string;
        type: import(".prisma/client").$Enums.MessageType;
        senderId: string;
    })[]>;
    static startGame(roomId: string, hostId: string): Promise<{
        players: {
            id: string;
            gameId: string;
            userId: string;
            characterId: string;
            position: string;
            isAlive: boolean;
            disconnected: boolean;
            score: number;
            joinedAt: Date;
            user: {
                id: string;
                username: string;
                avatarUrl: string | null;
                displayName: string | null;
                isOnline: boolean;
                isBot: boolean;
            };
        }[];
        host: {
            id: string;
            username: string;
            avatarUrl: string | null;
            displayName: string | null;
            isBot: boolean;
        };
        status: import(".prisma/client").$Enums.GameStatus;
        id: string;
        createdAt: Date;
        name: string;
        hostId: string;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        winnerId: string | null;
        updatedAt: Date;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static act(gameId: string, playerId: string, // GamePlayer.id
    action: 'roll' | 'move' | 'passage' | 'suggest' | 'reveal' | 'accuse' | 'endTurn', payload: Record<string, unknown>): Promise<EngineResult>;
    private static roll;
    private static move;
    private static passage;
    private static suggest;
    private static advanceSuggestion;
    private static reveal;
    private static accuse;
    private static endTurn;
    private static assertCurrentTurn;
    private static advanceTurnIndex;
    private static shuffle;
    private static persist;
    private static finishGame;
    private static envelopeOf;
    static getGameState(gameId: string, viewerUserId: string): Promise<{
        gameId: string;
        name: string;
        status: import(".prisma/client").$Enums.GameStatus;
        maxPlayers: number;
        settings: Prisma.JsonValue;
        phase: "waiting" | "playing" | "finished";
        turnOrder: string[];
        turnIndex: number;
        currentPlayerId: string;
        dice: [number, number] | null;
        stepsRemaining: number;
        moved: boolean;
        suggestedThisTurn: boolean;
        myPlayerId: string | null;
        myHand: Prisma.JsonArray;
        players: {
            id: string;
            userId: string;
            username: string;
            displayName: string | null;
            isBot: boolean;
            characterId: string;
            position: string;
            isAlive: boolean;
            disconnected: boolean;
            isHost: boolean;
            isOnline: boolean;
            score: number;
        }[];
        pendingSuggestion: Record<string, unknown> | null;
        winnerId: string | null;
        envelope: {
            suspectId: string;
            weaponId: string;
            roomId: string;
        } | null;
        startedAt: Date | null;
        endedAt: Date | null;
    }>;
    static getEvents(gameId: string, limit?: number): Promise<({
        player: ({
            user: {
                username: string;
                displayName: string | null;
            };
        } & {
            userId: string;
            id: string;
            gameId: string;
            characterId: string;
            position: string;
            hand: Prisma.JsonValue;
            isAlive: boolean;
            disconnected: boolean;
            score: number;
            joinedAt: Date;
            leftAt: Date | null;
        }) | null;
    } & {
        id: string;
        createdAt: Date;
        gameId: string;
        data: Prisma.JsonValue;
        type: string;
        playerId: string | null;
    })[]>;
}
//# sourceMappingURL=game.service.d.ts.map