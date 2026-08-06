"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify2FA = exports.disable2FA = exports.enable2FA = exports.resetPassword = exports.forgotPassword = exports.deleteAccount = exports.updateProfile = exports.getProfile = exports.changePassword = exports.logoutAll = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const auth_service_1 = require("../services/auth.service");
const validators_1 = require("../validators");
const loginGuard_1 = require("../utils/loginGuard");
const config_1 = require("../config");
const IS_PROD = config_1.config.nodeEnv === 'production';
const setRefreshCookie = (res, token, rememberMe = false) => {
    const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'strict',
        path: '/api/auth',
        maxAge,
    });
};
exports.register = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.registerSchema.parse(req.body);
    const result = await auth_service_1.AuthService.register(data);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(201).json({ success: true, data: { user: result.user, accessToken: result.tokens.accessToken } });
});
exports.login = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.loginSchema.parse(req.body);
    const ip = req.ip || 'unknown';
    if ((0, loginGuard_1.isLoginLocked)(data.email, ip)) {
        const wait = (0, loginGuard_1.secondsUntilUnlock)(data.email, ip);
        res.status(429).json({ success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: `Too many attempts. Try again in ${Math.max(1, Math.ceil(wait / 60))} minutes` } });
        return;
    }
    try {
        const result = await auth_service_1.AuthService.login(data.email, data.password, data.rememberMe, data.twoFactorCode);
        setRefreshCookie(res, result.tokens.refreshToken, data.rememberMe);
        res.json({ success: true, data: { user: result.user, accessToken: result.tokens.accessToken } });
    }
    catch (error) {
        if (error instanceof Error && /Invalid (credentials|two-factor)/.test(error.message)) {
            (0, loginGuard_1.recordLoginFailure)(data.email, ip);
        }
        throw error;
    }
});
exports.refresh = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // CSRF defense for cookie-based refresh: only accept same-origin requests.
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
        const effectiveOrigin = String(origin).replace(/\/$/, '');
        const allowed = [config_1.config.frontend.url.replace(/\/$/, ''), config_1.config.cors.origin.replace(/\/$/, '')];
        if (!allowed.includes(effectiveOrigin)) {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin request rejected' } });
            return;
        }
    }
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!refreshToken || typeof refreshToken !== 'string') {
        res.status(401).json({ success: false, error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token required' } });
        return;
    }
    const tokens = await auth_service_1.AuthService.refreshTokens(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ success: true, data: { accessToken: tokens.accessToken } });
});
exports.logout = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (refreshToken) {
        await auth_service_1.AuthService.logout(req.user.userId, refreshToken);
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, data: { message: 'Logged out successfully' } });
});
exports.logoutAll = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await auth_service_1.AuthService.logoutAll(req.user.userId);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, data: { message: 'Logged out from all devices' } });
});
exports.changePassword = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.changePasswordSchema.parse(req.body);
    await auth_service_1.AuthService.changePassword(req.user.userId, data.currentPassword, data.newPassword);
    res.json({ success: true, data: { message: 'Password changed successfully' } });
});
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await auth_service_1.AuthService.getProfile(req.user.userId);
    res.json({ success: true, data: user });
});
exports.updateProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.updateProfileSchema.parse(req.body);
    const user = await auth_service_1.AuthService.updateProfile(req.user.userId, data);
    res.json({ success: true, data: user });
});
exports.deleteAccount = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await auth_service_1.AuthService.deleteAccount(req.user.userId, req.body.password);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, data: { message: 'Account deleted' } });
});
exports.forgotPassword = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.forgotPasswordSchema.parse(req.body);
    await auth_service_1.AuthService.forgotPassword(data.email);
    res.json({ success: true, data: { message: 'If email exists, reset link sent' } });
});
exports.resetPassword = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.resetPasswordSchema.parse(req.body);
    await auth_service_1.AuthService.resetPassword(data.token, data.password);
    res.json({ success: true, data: { message: 'Password reset successful' } });
});
exports.enable2FA = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const result = await auth_service_1.AuthService.enable2FA(req.user.userId);
    res.json({ success: true, data: result });
});
exports.disable2FA = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.twoFactorSchema.parse(req.body);
    await auth_service_1.AuthService.disable2FA(req.user.userId, data.code);
    res.json({ success: true, data: { message: '2FA disabled' } });
});
exports.verify2FA = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const data = validators_1.twoFactorSchema.parse(req.body);
    const result = await auth_service_1.AuthService.verify2FA(req.user.userId, data.code);
    res.json({ success: true, data: result });
});
//# sourceMappingURL=auth.controller.js.map