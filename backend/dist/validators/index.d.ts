import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    username: string;
    password: string;
    displayName?: string | undefined;
}, {
    email: string;
    username: string;
    password: string;
    displayName?: string | undefined;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    twoFactorCode: z.ZodOptional<z.ZodString>;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    twoFactorCode?: string | undefined;
    rememberMe?: boolean | undefined;
}, {
    email: string;
    password: string;
    twoFactorCode?: string | undefined;
    rememberMe?: boolean | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string | undefined;
}, {
    refreshToken?: string | undefined;
}>;
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    avatarUrl?: string | undefined;
    displayName?: string | undefined;
    bio?: string | undefined;
}, {
    avatarUrl?: string | undefined;
    displayName?: string | undefined;
    bio?: string | undefined;
}>;
export declare const createRoomSchema: z.ZodObject<{
    name: z.ZodString;
    maxPlayers: z.ZodDefault<z.ZodNumber>;
    settings: z.ZodDefault<z.ZodObject<{
        maxPlayers: z.ZodDefault<z.ZodNumber>;
        allowSpectators: z.ZodDefault<z.ZodBoolean>;
        botCount: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxPlayers: number;
        botCount: number;
        allowSpectators: boolean;
    }, {
        maxPlayers?: number | undefined;
        botCount?: number | undefined;
        allowSpectators?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    maxPlayers: number;
    settings: {
        maxPlayers: number;
        botCount: number;
        allowSpectators: boolean;
    };
}, {
    name: string;
    maxPlayers?: number | undefined;
    settings?: {
        maxPlayers?: number | undefined;
        botCount?: number | undefined;
        allowSpectators?: boolean | undefined;
    } | undefined;
}>;
export declare const joinRoomSchema: z.ZodObject<{
    roomId: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    password?: string | undefined;
}, {
    roomId: string;
    password?: string | undefined;
}>;
export declare const listRoomsSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["WAITING", "STARTING", "IN_PROGRESS", "ROUND_END", "FINISHED", "CANCELLED"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "WAITING" | "STARTING" | "IN_PROGRESS" | "ROUND_END" | "FINISHED" | "CANCELLED" | undefined;
}, {
    status?: "WAITING" | "STARTING" | "IN_PROGRESS" | "ROUND_END" | "FINISHED" | "CANCELLED" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const updateRoomSchema: z.ZodObject<{
    roomId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        maxPlayers: z.ZodOptional<z.ZodNumber>;
        allowSpectators: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxPlayers?: number | undefined;
        allowSpectators?: boolean | undefined;
    }, {
        maxPlayers?: number | undefined;
        allowSpectators?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    roomId: string;
    name?: string | undefined;
    settings?: {
        maxPlayers?: number | undefined;
        allowSpectators?: boolean | undefined;
    } | undefined;
}, {
    roomId: string;
    name?: string | undefined;
    settings?: {
        maxPlayers?: number | undefined;
        allowSpectators?: boolean | undefined;
    } | undefined;
}>;
export declare const moveSchema: z.ZodObject<{
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    to: string;
}, {
    to: string;
}>;
export declare const suggestSchema: z.ZodObject<{
    suspectId: z.ZodEnum<["miss_scarlet", "colonel_mustard", "mrs_white", "mr_green", "mrs_peacock", "professor_plum"]>;
    weaponId: z.ZodEnum<["candlestick", "dagger", "lead_pipe", "revolver", "rope", "wrench"]>;
}, "strip", z.ZodTypeAny, {
    suspectId: "miss_scarlet" | "colonel_mustard" | "mrs_white" | "mr_green" | "mrs_peacock" | "professor_plum";
    weaponId: "candlestick" | "dagger" | "lead_pipe" | "revolver" | "rope" | "wrench";
}, {
    suspectId: "miss_scarlet" | "colonel_mustard" | "mrs_white" | "mr_green" | "mrs_peacock" | "professor_plum";
    weaponId: "candlestick" | "dagger" | "lead_pipe" | "revolver" | "rope" | "wrench";
}>;
export declare const revealSchema: z.ZodObject<{
    cardId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cardId: string;
}, {
    cardId: string;
}>;
export declare const accuseSchema: z.ZodObject<{
    suspectId: z.ZodEnum<["miss_scarlet", "colonel_mustard", "mrs_white", "mr_green", "mrs_peacock", "professor_plum"]>;
    weaponId: z.ZodEnum<["candlestick", "dagger", "lead_pipe", "revolver", "rope", "wrench"]>;
    roomId: z.ZodEnum<["kitchen", "ballroom", "conservatory", "dining_room", "library", "billiard_room", "lounge", "hall", "study"]>;
}, "strip", z.ZodTypeAny, {
    suspectId: "miss_scarlet" | "colonel_mustard" | "mrs_white" | "mr_green" | "mrs_peacock" | "professor_plum";
    weaponId: "candlestick" | "dagger" | "lead_pipe" | "revolver" | "rope" | "wrench";
    roomId: "kitchen" | "ballroom" | "conservatory" | "dining_room" | "library" | "billiard_room" | "lounge" | "hall" | "study";
}, {
    suspectId: "miss_scarlet" | "colonel_mustard" | "mrs_white" | "mr_green" | "mrs_peacock" | "professor_plum";
    weaponId: "candlestick" | "dagger" | "lead_pipe" | "revolver" | "rope" | "wrench";
    roomId: "kitchen" | "ballroom" | "conservatory" | "dining_room" | "library" | "billiard_room" | "lounge" | "hall" | "study";
}>;
export declare const chatSchema: z.ZodObject<{
    content: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["CHAT", "PRIVATE"]>>;
    receiverId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content: string;
    type: "CHAT" | "PRIVATE";
    receiverId?: string | undefined;
}, {
    content: string;
    receiverId?: string | undefined;
    type?: "CHAT" | "PRIVATE" | undefined;
}>;
export declare const friendRequestSchema: z.ZodObject<{
    receiverId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    receiverId: string;
}, {
    receiverId: string;
}>;
export declare const friendActionSchema: z.ZodObject<{
    requestId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    requestId: string;
}, {
    requestId: string;
}>;
export declare const notificationSchema: z.ZodObject<{
    notificationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notificationId: string;
}, {
    notificationId: string;
}>;
export declare const oauthSchema: z.ZodObject<{
    provider: z.ZodEnum<["google", "github", "42"]>;
    code: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    provider: "google" | "github" | "42";
    state?: string | undefined;
}, {
    code: string;
    provider: "google" | "github" | "42";
    state?: string | undefined;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export declare const twoFactorSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
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
//# sourceMappingURL=index.d.ts.map