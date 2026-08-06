"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twoFactorSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.oauthSchema = exports.notificationSchema = exports.friendActionSchema = exports.friendRequestSchema = exports.chatSchema = exports.accuseSchema = exports.revealSchema = exports.suggestSchema = exports.moveSchema = exports.updateRoomSchema = exports.listRoomsSchema = exports.joinRoomSchema = exports.createRoomSchema = exports.updateProfileSchema = exports.changePasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address').max(255),
    username: zod_1.z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
    displayName: zod_1.z.string().min(1).max(50).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
    twoFactorCode: zod_1.z.string().length(6).optional(),
    rememberMe: zod_1.z.boolean().optional(),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required').optional(),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
});
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().max(50).optional(),
    bio: zod_1.z.string().max(500).optional(),
    avatarUrl: zod_1.z.string().url('Invalid avatar URL').refine((url) => url.startsWith('http://') || url.startsWith('https://'), { message: 'Avatar URL must be http(s)' }).optional().or(zod_1.z.literal('')),
});
exports.createRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Room name is required').max(100),
    maxPlayers: zod_1.z.number().int().min(3).max(6).default(6),
    settings: zod_1.z.object({
        maxPlayers: zod_1.z.number().int().min(3).max(6).default(6),
        allowSpectators: zod_1.z.boolean().default(false),
        botCount: zod_1.z.number().int().min(0).max(5).default(0),
    }).default({}),
});
exports.joinRoomSchema = zod_1.z.object({
    roomId: zod_1.z.string().uuid('Invalid room ID'),
    password: zod_1.z.string().optional(),
});
exports.listRoomsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    status: zod_1.z.enum(['WAITING', 'STARTING', 'IN_PROGRESS', 'ROUND_END', 'FINISHED', 'CANCELLED']).optional(),
});
exports.updateRoomSchema = zod_1.z.object({
    roomId: zod_1.z.string().uuid('Invalid room ID'),
    name: zod_1.z.string().min(1).max(100).optional(),
    settings: zod_1.z.object({
        maxPlayers: zod_1.z.number().int().min(3).max(6).optional(),
        allowSpectators: zod_1.z.boolean().optional(),
    }).optional(),
});
exports.moveSchema = zod_1.z.object({
    to: zod_1.z.string().min(1, 'Destination required').max(32),
});
exports.suggestSchema = zod_1.z.object({
    suspectId: zod_1.z.enum(['miss_scarlet', 'colonel_mustard', 'mrs_white', 'mr_green', 'mrs_peacock', 'professor_plum']),
    weaponId: zod_1.z.enum(['candlestick', 'dagger', 'lead_pipe', 'revolver', 'rope', 'wrench']),
});
exports.revealSchema = zod_1.z.object({
    cardId: zod_1.z.string().min(1).max(32),
});
exports.accuseSchema = zod_1.z.object({
    suspectId: zod_1.z.enum(['miss_scarlet', 'colonel_mustard', 'mrs_white', 'mr_green', 'mrs_peacock', 'professor_plum']),
    weaponId: zod_1.z.enum(['candlestick', 'dagger', 'lead_pipe', 'revolver', 'rope', 'wrench']),
    roomId: zod_1.z.enum(['kitchen', 'ballroom', 'conservatory', 'dining_room', 'library', 'billiard_room', 'lounge', 'hall', 'study']),
});
exports.chatSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Message cannot be empty').max(1000),
    type: zod_1.z.enum(['CHAT', 'PRIVATE']).default('CHAT'),
    receiverId: zod_1.z.string().uuid().optional(),
});
exports.friendRequestSchema = zod_1.z.object({
    receiverId: zod_1.z.string().uuid('Invalid user ID'),
});
exports.friendActionSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid('Invalid request ID'),
});
exports.notificationSchema = zod_1.z.object({
    notificationId: zod_1.z.string().uuid('Invalid notification ID'),
});
exports.oauthSchema = zod_1.z.object({
    provider: zod_1.z.enum(['google', 'github', '42']),
    code: zod_1.z.string().min(1, 'Authorization code is required'),
    state: zod_1.z.string().optional(),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
});
exports.twoFactorSchema = zod_1.z.object({
    code: zod_1.z.string().length(6, '2FA code must be 6 digits'),
});
//# sourceMappingURL=index.js.map