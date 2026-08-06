import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ZodSchema } from 'zod';
import { ValidationError } from './errorHandler';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({ ...req.params, ...req.query, ...req.body });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Validation failed', { errors: error.errors }));
        return;
      }
      next(error);
    }
  };
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    if (Array.isArray(value)) {
      return value.map(sanitize);
    }
    if (value && typeof value === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        sanitized[key] = sanitize(v);
      }
      return sanitized;
    }
    return value;
  };

  req.body = sanitize(req.body) as Request['body'];
  req.query = sanitize(req.query) as Request['query'];
  req.params = sanitize(req.params) as Request['params'];
  next();
};

export const validateFileUpload = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    interface UploadedFile {
      size: number;
      originalname: string;
      mimetype: string;
    }
    const typedReq = req as Request & { file?: UploadedFile; files?: UploadedFile | UploadedFile[] | Record<string, UploadedFile[]> };
    if (!typedReq.file && !typedReq.files) {
      return next();
    }

    const files = typedReq.files
      ? (Array.isArray(typedReq.files) ? typedReq.files : Object.values(typedReq.files).flat())
      : [typedReq.file!];

    for (const file of files) {
      if (file.size > maxSize) {
        throw new ValidationError(`File ${file.originalname} exceeds maximum size of ${maxSize} bytes`);
      }

      if (!allowedTypes.includes(file.mimetype)) {
        throw new ValidationError(`File type ${file.mimetype} not allowed`);
      }
    }

    next();
  };
};