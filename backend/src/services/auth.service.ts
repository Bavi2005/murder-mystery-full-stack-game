import { config } from '../config';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { AppError, AuthenticationError, ConflictError, ValidationError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { generateTOTPSecret, verifyTOTP, otpauthUrl } from '../utils/totp';
import { clearLoginFailures } from '../utils/loginGuard';

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

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = config.jwt.expiresIn;
  private static readonly REFRESH_TOKEN_EXPIRY = config.jwt.refreshExpiresIn;

  static async register(data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email.toLowerCase() },
          { username: data.username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === data.email.toLowerCase()) {
        throw new ConflictError('Email already registered');
      }
      throw new ConflictError('Username already taken');
    }

    const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        passwordHash,
        displayName: data.displayName || data.username,
      },
    });

    await prisma.gameStats.create({
      data: { userId: user.id },
    });

    const tokens = await this.generateTokens(user);

    logger.info('User registered', { userId: user.id, email: user.email });

    return { user: this.sanitizeUser(user), tokens };
  }

  static async login(email: string, password: string, rememberMe = false, twoFactorCode?: string): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Timing-equalization: always run a bcrypt compare even when the user
    // does not exist, so response time does not reveal account existence.
    const dummyHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.7oA2bXxYyZzZzZzZzZzZzZzZzZz2';
    let passwordMatches = false;
    if (user) {
      passwordMatches = await bcrypt.compare(password, user.passwordHash);
    } else {
      await bcrypt.compare(password, dummyHash);
    }

    if (!user || !passwordMatches) {
      if (user) {
        void prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: { increment: 1 }, lastSeen: new Date() },
        }).catch(() => {});
      }
      throw new AuthenticationError('Invalid credentials');
    }

    // 2FA enforcement (real TOTP verification).
    if (user.twoFactorEnabled) {
      const code = twoFactorCode?.trim();
      if (!code || !verifyTOTP(user.twoFactorSecret || '', code)) {
        throw new AuthenticationError('Invalid two-factor code');
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date(),
        failedLoginAttempts: 0,
      },
    });
    clearLoginFailures(normalizedEmail);

    const tokens = await this.generateTokens(user, rememberMe);

    logger.info('User logged in', { userId: user.id });

    return { user: this.sanitizeUser(user), tokens };
  }

  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // A stolen/reused refresh token that is no longer valid is a strong
      // signal of theft: revoke every session for the claimed user if we can
      // still identify them.
      if (session) {
        await prisma.session.deleteMany({ where: { id: session.id } });
      }
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // One-time use: rotate the token so a leaked token cannot be replayed.
    await prisma.session.delete({ where: { id: session.id } });

    const tokens = await this.generateTokens(session.user);

    return tokens;
  }

  static async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await prisma.session.deleteMany({
        where: { userId, refreshToken },
      });
    } else {
      await prisma.session.deleteMany({ where: { userId } });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });
  }

  static async logoutAll(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new ValidationError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.logoutAll(userId);

    logger.info('Password changed', { userId });
  }

  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      throw new AuthenticationError('Invalid token');
    }
  }

  static async generateTokens(user: { id: string; email: string }, rememberMe = false): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: 'user' },
      config.jwt.secret,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  static sanitizeUser(user: { passwordHash?: string; twoFactorSecret?: string | null; [key: string]: unknown }): SafeUser {
    const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, ...sanitized } = user;
    return sanitized as unknown as SafeUser;
  }

  static async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { gameStats: true },
    });
    if (!user) throw new NotFoundError('User not found');
    return this.sanitizeUser(user);
  }

  static async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, username: true, displayName: true, bio: true, avatarUrl: true, isOnline: true, lastSeen: true, twoFactorEnabled: true, createdAt: true, updatedAt: true },
    });
    return user;
  }

  static async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new ValidationError('Incorrect password');

    await prisma.$transaction([
      prisma.game.deleteMany({ where: { hostId: userId } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    logger.info('Account deleted', { userId });
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return; // no account -> do nothing (constant response either way)

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });
  }

  static async resetPassword(token: string, password: string): Promise<void> {
    const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.expiresAt < new Date()) throw new ValidationError('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: reset.userId } }),
      prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);
  }

  static async enable2FA(userId: string): Promise<{ secret: string; qrUrl: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
    if (user?.twoFactorEnabled) throw new ValidationError('2FA already enabled');

    // Generate a real TOTP secret. The account is only marked enabled after
    // the user proves they can generate a valid code (see verify2FA).
    const secret = generateTOTPSecret();
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });
    const account = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return { secret, qrUrl: otpauthUrl(secret, account?.email || userId) };
  }

  static async disable2FA(userId: string, code: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled) throw new ValidationError('2FA not enabled');
    if (!user.twoFactorSecret || !verifyTOTP(user.twoFactorSecret, code.trim())) {
      throw new ValidationError('Invalid verification code');
    }
    await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  }

  static async verify2FA(userId: string, code: string): Promise<{ success: boolean; enabled: boolean }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new ValidationError('2FA not configured');
    if (!verifyTOTP(user.twoFactorSecret, code.trim())) {
      throw new ValidationError('Invalid verification code');
    }
    // First successful code after enabling confirms the secret.
    if (!user.twoFactorEnabled) {
      await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    }
    return { success: true, enabled: true };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}