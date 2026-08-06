import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            token?: string;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const generateTokens: (payload: Omit<TokenPayload, "iat" | "exp">) => {
    accessToken: string;
    refreshToken: string;
};
export declare const verifyRefreshToken: (token: string) => TokenPayload;
/** Verify a short-lived access token (used for REST + socket handshake). */
export declare const verifyAccessToken: (token: string) => TokenPayload;
//# sourceMappingURL=auth.d.ts.map