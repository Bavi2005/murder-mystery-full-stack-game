import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
export declare const validate: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateFileUpload: (allowedTypes: string[], maxSize: number) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map