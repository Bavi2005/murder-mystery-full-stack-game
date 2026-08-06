"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileUpload = exports.sanitizeInput = exports.validate = void 0;
const zod_1 = require("zod");
const errorHandler_1 = require("./errorHandler");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({ ...req.params, ...req.query, ...req.body });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next(new errorHandler_1.ValidationError('Validation failed', { errors: error.errors }));
                return;
            }
            next(error);
        }
    };
};
exports.validate = validate;
const sanitizeInput = (req, res, next) => {
    const sanitize = (value) => {
        if (typeof value === 'string') {
            return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }
        if (Array.isArray(value)) {
            return value.map(sanitize);
        }
        if (value && typeof value === 'object') {
            const sanitized = {};
            for (const [key, v] of Object.entries(value)) {
                sanitized[key] = sanitize(v);
            }
            return sanitized;
        }
        return value;
    };
    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    next();
};
exports.sanitizeInput = sanitizeInput;
const validateFileUpload = (allowedTypes, maxSize) => {
    return (req, res, next) => {
        const typedReq = req;
        if (!typedReq.file && !typedReq.files) {
            return next();
        }
        const files = typedReq.files
            ? (Array.isArray(typedReq.files) ? typedReq.files : Object.values(typedReq.files).flat())
            : [typedReq.file];
        for (const file of files) {
            if (file.size > maxSize) {
                throw new errorHandler_1.ValidationError(`File ${file.originalname} exceeds maximum size of ${maxSize} bytes`);
            }
            if (!allowedTypes.includes(file.mimetype)) {
                throw new errorHandler_1.ValidationError(`File type ${file.mimetype} not allowed`);
            }
        }
        next();
    };
};
exports.validateFileUpload = validateFileUpload;
//# sourceMappingURL=validation.js.map