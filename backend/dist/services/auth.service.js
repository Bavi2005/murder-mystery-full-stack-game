"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.AuthService = void 0;
const config_1 = require("../config");
const prisma_1 = require("../config/prisma");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const totp_1 = require("../utils/totp");
const loginGuard_1 = require("../utils/loginGuard");
class AuthService {
    static ACCESS_TOKEN_EXPIRY = config_1.config.jwt.expiresIn;
    static REFRESH_TOKEN_EXPIRY = config_1.config.jwt.refreshExpiresIn;
    static async register(data) {
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: data.email.toLowerCase() },
                    { username: data.username.toLowerCase() },
                ],
            },
        });
        if (existingUser) {
            if (existingUser.email === data.email.toLowerCase()) {
                throw new errorHandler_1.ConflictError('Email already registered');
            }
            throw new errorHandler_1.ConflictError('Username already taken');
        }
        const passwordHash = await bcryptjs_1.default.hash(data.password, config_1.config.bcrypt.rounds);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: data.email.toLowerCase(),
                username: data.username.toLowerCase(),
                passwordHash,
                displayName: data.displayName || data.username,
            },
        });
        await prisma_1.prisma.gameStats.create({
            data: { userId: user.id },
        });
        const tokens = await this.generateTokens(user);
        logger_1.logger.info('User registered', { userId: user.id, email: user.email });
        return { user: this.sanitizeUser(user), tokens };
    }
    static async login(email, password, rememberMe = false, twoFactorCode) {
        const normalizedEmail = email.toLowerCase();
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        // Timing-equalization: always run a bcrypt compare even when the user
        // does not exist, so response time does not reveal account existence.
        const dummyHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7oA2bXxYyZzZzZzZzZzZzZzZzZz2';
        let passwordMatches = false;
        if (user) {
            passwordMatches = await bcryptjs_1.default.compare(password, user.passwordHash);
        }
        else {
            await bcryptjs_1.default.compare(password, dummyHash);
        }
        if (!user || !passwordMatches) {
            if (user) {
                void prisma_1.prisma.user.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: { increment: 1 }, lastSeen: new Date() },
                }).catch(() => { });
            }
            throw new errorHandler_1.AuthenticationError('Invalid credentials');
        }
        // 2FA enforcement (real TOTP verification).
        if (user.twoFactorEnabled) {
            const code = twoFactorCode?.trim();
            if (!code || !(0, totp_1.verifyTOTP)(user.twoFactorSecret || '', code)) {
                throw new errorHandler_1.AuthenticationError('Invalid two-factor code');
            }
        }
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                isOnline: true,
                lastSeen: new Date(),
                failedLoginAttempts: 0,
            },
        });
        (0, loginGuard_1.clearLoginFailures)(normalizedEmail);
        const tokens = await this.generateTokens(user, rememberMe);
        logger_1.logger.info('User logged in', { userId: user.id });
        return { user: this.sanitizeUser(user), tokens };
    }
    static async refreshTokens(refreshToken) {
        const session = await prisma_1.prisma.session.findUnique({
            where: { refreshToken },
            include: { user: true },
        });
        if (!session || session.expiresAt < new Date()) {
            // A stolen/reused refresh token that is no longer valid is a strong
            // signal of theft: revoke every session for the claimed user if we can
            // still identify them.
            if (session) {
                await prisma_1.prisma.session.deleteMany({ where: { id: session.id } });
            }
            throw new errorHandler_1.AuthenticationError('Invalid or expired refresh token');
        }
        // One-time use: rotate the token so a leaked token cannot be replayed.
        await prisma_1.prisma.session.delete({ where: { id: session.id } });
        const tokens = await this.generateTokens(session.user);
        return tokens;
    }
    static async logout(userId, refreshToken) {
        if (refreshToken) {
            await prisma_1.prisma.session.deleteMany({
                where: { userId, refreshToken },
            });
        }
        else {
            await prisma_1.prisma.session.deleteMany({ where: { userId } });
        }
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
        });
    }
    static async logoutAll(userId) {
        await prisma_1.prisma.session.deleteMany({ where: { userId } });
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
        });
    }
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new NotFoundError('User not found');
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isValid)
            throw new errorHandler_1.ValidationError('Current password is incorrect');
        const passwordHash = await bcryptjs_1.default.hash(newPassword, config_1.config.bcrypt.rounds);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
        await this.logoutAll(userId);
        logger_1.logger.info('Password changed', { userId });
    }
    static async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errorHandler_1.AuthenticationError('Token expired');
            }
            throw new errorHandler_1.AuthenticationError('Invalid token');
        }
    }
    static async generateTokens(user, rememberMe = false) {
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: 'user' }, config_1.config.jwt.secret, { expiresIn: this.ACCESS_TOKEN_EXPIRY });
        const refreshToken = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
        await prisma_1.prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                expiresAt,
            },
        });
        return { accessToken, refreshToken };
    }
    static sanitizeUser(user) {
        const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, ...sanitized } = user;
        return sanitized;
    }
    static async getProfile(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: { gameStats: true },
        });
        if (!user)
            throw new NotFoundError('User not found');
        return this.sanitizeUser(user);
    }
    static async updateProfile(userId, data) {
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data,
            select: { id: true, email: true, username: true, displayName: true, bio: true, avatarUrl: true, isOnline: true, lastSeen: true, twoFactorEnabled: true, createdAt: true, updatedAt: true },
        });
        return user;
    }
    static async deleteAccount(userId, password) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new NotFoundError('User not found');
        const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValid)
            throw new errorHandler_1.ValidationError('Incorrect password');
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.game.deleteMany({ where: { hostId: userId } }),
            prisma_1.prisma.session.deleteMany({ where: { userId } }),
            prisma_1.prisma.user.delete({ where: { id: userId } }),
        ]);
        logger_1.logger.info('Account deleted', { userId });
    }
    static async forgotPassword(email) {
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user)
            return; // no account -> do nothing (constant response either way)
        const token = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await prisma_1.prisma.passwordResetToken.create({
            data: { userId: user.id, token, expiresAt },
        });
    }
    static async resetPassword(token, password) {
        const reset = await prisma_1.prisma.passwordResetToken.findUnique({ where: { token } });
        if (!reset || reset.expiresAt < new Date())
            throw new errorHandler_1.ValidationError('Invalid or expired reset token');
        const passwordHash = await bcryptjs_1.default.hash(password, config_1.config.bcrypt.rounds);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
            prisma_1.prisma.passwordResetToken.deleteMany({ where: { userId: reset.userId } }),
            prisma_1.prisma.session.deleteMany({ where: { userId: reset.userId } }),
        ]);
    }
    static async enable2FA(userId) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
        if (user?.twoFactorEnabled)
            throw new errorHandler_1.ValidationError('2FA already enabled');
        // Generate a real TOTP secret. The account is only marked enabled after
        // the user proves they can generate a valid code (see verify2FA).
        const secret = (0, totp_1.generateTOTPSecret)();
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });
        const account = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        return { secret, qrUrl: (0, totp_1.otpauthUrl)(secret, account?.email || userId) };
    }
    static async disable2FA(userId, code) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.twoFactorEnabled)
            throw new errorHandler_1.ValidationError('2FA not enabled');
        if (!user.twoFactorSecret || !(0, totp_1.verifyTOTP)(user.twoFactorSecret, code.trim())) {
            throw new errorHandler_1.ValidationError('Invalid verification code');
        }
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
    }
    static async verify2FA(userId, code) {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.twoFactorSecret)
            throw new errorHandler_1.ValidationError('2FA not configured');
        if (!(0, totp_1.verifyTOTP)(user.twoFactorSecret, code.trim())) {
            throw new errorHandler_1.ValidationError('Invalid verification code');
        }
        // First successful code after enabling confirms the secret.
        if (!user.twoFactorEnabled) {
            await prisma_1.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
        }
        return { success: true, enabled: true };
    }
}
exports.AuthService = AuthService;
class NotFoundError extends errorHandler_1.AppError {
    constructor(message = 'Resource not found') {
        super(404, message, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
//# sourceMappingURL=auth.service.js.map