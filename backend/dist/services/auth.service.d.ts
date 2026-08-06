import { AppError } from '../middleware/errorHandler';
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    tokenVersion?: number;
}
type SafeUser = {
    id: string;
    email: string;
    username: string;
    avatarUrl: string | null;
    displayName: string | null;
    bio: string | null;
    isOnline: boolean;
    lastSeen: Date | null;
    twoFactorEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
};
export declare class AuthService {
    private static readonly ACCESS_TOKEN_EXPIRY;
    private static readonly REFRESH_TOKEN_EXPIRY;
    static register(data: {
        email: string;
        username: string;
        password: string;
        displayName?: string;
    }): Promise<{
        user: SafeUser;
        tokens: AuthTokens;
    }>;
    static login(email: string, password: string, rememberMe?: boolean, twoFactorCode?: string): Promise<{
        user: SafeUser;
        tokens: AuthTokens;
    }>;
    static refreshTokens(refreshToken: string): Promise<AuthTokens>;
    static logout(userId: string, refreshToken?: string): Promise<void>;
    static logoutAll(userId: string): Promise<void>;
    static changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    static verifyToken(token: string): Promise<TokenPayload>;
    static generateTokens(user: {
        id: string;
        email: string;
    }, rememberMe?: boolean): Promise<AuthTokens>;
    static sanitizeUser(user: {
        passwordHash?: string;
        twoFactorSecret?: string | null;
        [key: string]: unknown;
    }): SafeUser;
    static getProfile(userId: string): Promise<SafeUser>;
    static updateProfile(userId: string, data: {
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
    }): Promise<SafeUser>;
    static deleteAccount(userId: string, password: string): Promise<void>;
    static forgotPassword(email: string): Promise<void>;
    static resetPassword(token: string, password: string): Promise<void>;
    static enable2FA(userId: string): Promise<{
        secret: string;
        qrUrl: string;
    }>;
    static disable2FA(userId: string, code: string): Promise<void>;
    static verify2FA(userId: string, code: string): Promise<{
        success: boolean;
        enabled: boolean;
    }>;
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export {};
//# sourceMappingURL=auth.service.d.ts.map