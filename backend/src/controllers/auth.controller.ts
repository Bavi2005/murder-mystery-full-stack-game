import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema, twoFactorSchema } from '../validators';
import { isLoginLocked, recordLoginFailure, secondsUntilUnlock } from '../utils/loginGuard';
import { config } from '../config';

const IS_PROD = config.nodeEnv === 'production';

const setRefreshCookie = (res: Response, token: string, rememberMe = false) => {
  const maxAge = (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge,
  });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const result = await AuthService.register(data);
  setRefreshCookie(res, result.tokens.refreshToken);
  res.status(201).json({ success: true, data: { user: result.user, accessToken: result.tokens.accessToken } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const ip = req.ip || 'unknown';

  if (isLoginLocked(data.email, ip)) {
    const wait = secondsUntilUnlock(data.email, ip);
    res.status(429).json({ success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: `Too many attempts. Try again in ${Math.max(1, Math.ceil(wait / 60))} minutes` } });
    return;
  }

try {
    const result = await AuthService.login(data.email, data.password, data.rememberMe, data.twoFactorCode);
    setRefreshCookie(res, result.tokens.refreshToken, data.rememberMe);
    res.json({ success: true, data: { user: result.user, accessToken: result.tokens.accessToken } });
  } catch (error) {
    if (error instanceof Error && /Invalid (credentials|two-factor)/.test(error.message)) {
      recordLoginFailure(data.email, ip);
    }
    throw error;
  }
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // CSRF defense for cookie-based refresh: only accept same-origin requests.
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    const effectiveOrigin = String(origin).replace(/\/$/, '');
    const allowed = [config.frontend.url.replace(/\/$/, ''), config.cors.origin.replace(/\/$/, '')];
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

  const tokens = await AuthService.refreshTokens(refreshToken);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ success: true, data: { accessToken: tokens.accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (refreshToken) {
    await AuthService.logout(req.user!.userId, refreshToken);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.logoutAll(req.user!.userId);
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true, data: { message: 'Logged out from all devices' } });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const data = changePasswordSchema.parse(req.body);
  await AuthService.changePassword(req.user!.userId, data.currentPassword, data.newPassword);
  res.json({ success: true, data: { message: 'Password changed successfully' } });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await AuthService.getProfile(req.user!.userId);
  res.json({ success: true, data: user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await AuthService.updateProfile(req.user!.userId, data);
  res.json({ success: true, data: user });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.deleteAccount(req.user!.userId, req.body.password);
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true, data: { message: 'Account deleted' } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = forgotPasswordSchema.parse(req.body);
  await AuthService.forgotPassword(data.email);
  res.json({ success: true, data: { message: 'If email exists, reset link sent' } });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = resetPasswordSchema.parse(req.body);
  await AuthService.resetPassword(data.token, data.password);
  res.json({ success: true, data: { message: 'Password reset successful' } });
});

export const enable2FA = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.enable2FA(req.user!.userId);
  res.json({ success: true, data: result });
});

export const disable2FA = asyncHandler(async (req: Request, res: Response) => {
  const data = twoFactorSchema.parse(req.body);
  await AuthService.disable2FA(req.user!.userId, data.code);
  res.json({ success: true, data: { message: '2FA disabled' } });
});

export const verify2FA = asyncHandler(async (req: Request, res: Response) => {
  const data = twoFactorSchema.parse(req.body);
  const result = await AuthService.verify2FA(req.user!.userId, data.code);
  res.json({ success: true, data: result });
});