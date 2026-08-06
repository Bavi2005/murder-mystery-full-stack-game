import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { register, login, refresh, logout, logoutAll, changePassword, getProfile, updateProfile, deleteAccount, forgotPassword, resetPassword, enable2FA, verify2FA, disable2FA } from '../controllers/auth.controller';
import { registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema, twoFactorSchema } from '../validators';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/refresh', validate(refreshTokenSchema), refresh);
authRouter.post('/logout', authenticate, logout);
authRouter.post('/logout-all', authenticate, logoutAll);
authRouter.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRouter.post('/2fa/enable', authenticate, enable2FA);
authRouter.post('/2fa/verify', authenticate, validate(twoFactorSchema), verify2FA);
authRouter.post('/2fa/disable', authenticate, validate(twoFactorSchema), disable2FA);
authRouter.get('/profile', authenticate, getProfile);
authRouter.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
authRouter.delete('/account', authenticate, deleteAccount);