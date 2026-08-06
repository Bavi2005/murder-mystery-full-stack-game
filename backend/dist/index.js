"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const xss_clean_1 = __importDefault(require("xss-clean"));
const hpp_1 = __importDefault(require("hpp"));
const config_1 = require("./config");
const prisma_1 = require("./config/prisma");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const game_routes_1 = require("./routes/game.routes");
const user_routes_1 = require("./routes/user.routes");
const auth_routes_1 = require("./routes/auth.routes");
const socket_1 = require("./socket");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: config_1.config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});
app.set('trust proxy', 1);
const IS_PROD = config_1.config.nodeEnv === 'production';
app.use((0, helmet_1.default)({
    contentSecurityPolicy: IS_PROD
        ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'wss:', 'https:'],
                fontSrc: ["'self'", 'data:'],
                objectSrc: ["'none'"],
                baseUri: ["'none'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
            },
        }
        : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
app.use((0, cors_1.default)({
    origin: config_1.config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '256kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '64kb' }));
app.use((0, cookie_parser_1.default)(config_1.config.cookie.secret));
app.use((0, express_mongo_sanitize_1.default)());
app.use((0, xss_clean_1.default)());
app.use((0, hpp_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.maxRequests,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
});
// Stricter limiters for sensitive routes (brute-force / spam protection).
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts' } },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
});
const gameActionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many game actions' } },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
});
app.use('/api/', limiter);
app.get('/health', (req, res) => {
    res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
});
// Tight limits on credential-adjacent endpoints regardless of auth state.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth/2fa', authLimiter);
// Gameplay endpoints are actions: bound tighter than generic browsing.
app.use('/api/games/rooms/:roomId/roll', gameActionLimiter);
app.use('/api/games/rooms/:roomId/move', gameActionLimiter);
app.use('/api/games/rooms/:roomId/suggest', gameActionLimiter);
app.use('/api/games/rooms/:roomId/reveal', gameActionLimiter);
app.use('/api/games/rooms/:roomId/accuse', gameActionLimiter);
app.use('/api/games/rooms/:roomId/end-turn', gameActionLimiter);
app.use('/api/games/rooms/:roomId/chat', gameActionLimiter);
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/users', user_routes_1.userRouter);
app.use('/api/games', game_routes_1.gameRouter);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
(0, socket_1.setupSocketHandlers)(io);
const startServer = async () => {
    try {
        await prisma_1.prisma.$connect();
        logger_1.logger.info('Database connected');
        httpServer.listen(config_1.config.port, () => {
            logger_1.logger.info(`Server running on port ${config_1.config.port} in ${config_1.config.nodeEnv} mode`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`${signal} received, shutting down gracefully`);
    httpServer.close(async () => {
        await prisma_1.prisma.$disconnect();
        logger_1.logger.info('Database disconnected');
        process.exit(0);
    });
    setTimeout(() => {
        logger_1.logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
startServer();
//# sourceMappingURL=index.js.map