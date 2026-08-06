"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    database: {
        url: process.env.DATABASE_URL || 'postgresql://transcendence:transcendence_secure_2024@localhost:5432/transcendence',
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://:redis_secure_2024@localhost:6379',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || 'redis_secure_2024',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production_min_32_chars',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_change_in_production_min_32_chars',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    frontend: {
        url: process.env.FRONTEND_URL || 'https://localhost',
    },
    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'https://localhost',
    },
    cookie: {
        secret: process.env.COOKIE_SECRET || 'cookie_secret_change_in_production',
    },
    encryption: {
        key: process.env.ENCRYPTION_KEY || '32_char_encryption_key_change_me',
    },
};
//# sourceMappingURL=index.js.map