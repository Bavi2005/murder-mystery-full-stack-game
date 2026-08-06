import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
  displayName: z.string().min(1).max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().length(6).optional(),
  rememberMe: z.boolean().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    { message: 'Avatar URL must be http(s)' }
  ).optional().or(z.literal('')),
});

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100),
  maxPlayers: z.number().int().min(3).max(6).default(6),
  settings: z.object({
    maxPlayers: z.number().int().min(3).max(6).default(6),
    allowSpectators: z.boolean().default(false),
    botCount: z.number().int().min(0).max(5).default(0),
  }).default({}),
});

export const joinRoomSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
  password: z.string().optional(),
});

export const listRoomsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['WAITING', 'STARTING', 'IN_PROGRESS', 'ROUND_END', 'FINISHED', 'CANCELLED']).optional(),
});

export const updateRoomSchema = z.object({
  roomId: z.string().uuid('Invalid room ID'),
  name: z.string().min(1).max(100).optional(),
  settings: z.object({
    maxPlayers: z.number().int().min(3).max(6).optional(),
    allowSpectators: z.boolean().optional(),
  }).optional(),
});

export const moveSchema = z.object({
  to: z.string().min(1, 'Destination required').max(32),
});

export const suggestSchema = z.object({
  suspectId: z.enum(['miss_scarlet', 'colonel_mustard', 'mrs_white', 'mr_green', 'mrs_peacock', 'professor_plum']),
  weaponId: z.enum(['candlestick', 'dagger', 'lead_pipe', 'revolver', 'rope', 'wrench']),
});

export const revealSchema = z.object({
  cardId: z.string().min(1).max(32),
});

export const accuseSchema = z.object({
  suspectId: z.enum(['miss_scarlet', 'colonel_mustard', 'mrs_white', 'mr_green', 'mrs_peacock', 'professor_plum']),
  weaponId: z.enum(['candlestick', 'dagger', 'lead_pipe', 'revolver', 'rope', 'wrench']),
  roomId: z.enum(['kitchen', 'ballroom', 'conservatory', 'dining_room', 'library', 'billiard_room', 'lounge', 'hall', 'study']),
});

export const chatSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
  type: z.enum(['CHAT', 'PRIVATE']).default('CHAT'),
  receiverId: z.string().uuid().optional(),
});

export const friendRequestSchema = z.object({
  receiverId: z.string().uuid('Invalid user ID'),
});

export const friendActionSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
});

export const notificationSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
});

export const oauthSchema = z.object({
  provider: z.enum(['google', 'github', '42']),
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number, and special character'),
});

export const twoFactorSchema = z.object({
  code: z.string().length(6, '2FA code must be 6 digits'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type ListRoomsInput = z.infer<typeof listRoomsSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type MoveInput = z.infer<typeof moveSchema>;
export type SuggestInput = z.infer<typeof suggestSchema>;
export type RevealInput = z.infer<typeof revealSchema>;
export type AccuseInput = z.infer<typeof accuseSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type FriendActionInput = z.infer<typeof friendActionSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type OAuthInput = z.infer<typeof oauthSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TwoFactorInput = z.infer<typeof twoFactorSchema>;