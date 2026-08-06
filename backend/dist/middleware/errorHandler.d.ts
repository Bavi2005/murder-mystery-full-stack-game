import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    message: string;
    code: string;
    details?: Record<string, unknown> | undefined;
    constructor(statusCode: number, message: string, code: string, details?: Record<string, unknown> | undefined);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class ConflictError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare class InternalServerError extends AppError {
    constructor(message?: string, details?: Record<string, unknown>);
}
export declare const errorHandler: (err: Error, req: Request, res: Response, _next: NextFunction) => Response<any, Record<string, any>>;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
//# sourceMappingURL=errorHandler.d.ts.map