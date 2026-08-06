"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = exports.verifyRefreshToken = exports.generateTokens = exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const prisma_1 = require("../config/prisma");
const errorHandler_1 = require("./errorHandler");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errorHandler_1.AuthenticationError('No token provided');
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const session = await prisma_1.prisma.session.findFirst({
                where: {
                    userId: decoded.userId,
                    expiresAt: { gt: new Date() },
                },
            });
            if (!session) {
                throw new errorHandler_1.AuthenticationError('Session expired');
            }
            req.user = decoded;
            req.token = token;
            next();
        }
        catch (jwtError) {
            if (jwtError instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errorHandler_1.AuthenticationError('Token expired');
            }
            if (jwtError instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errorHandler_1.AuthenticationError('Invalid token');
            }
            throw new errorHandler_1.AuthenticationError('Token verification failed');
        }
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const session = await prisma_1.prisma.session.findFirst({
                where: {
                    userId: decoded.userId,
                    expiresAt: { gt: new Date() },
                },
            });
            if (session) {
                req.user = decoded;
                req.token = token;
            }
        }
        catch {
            // Token invalid, continue without auth
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuth = optionalAuth;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new errorHandler_1.AuthenticationError('Authentication required');
        }
        if (roles.length && !roles.includes(req.user.role)) {
            throw new errorHandler_1.AuthorizationError('Insufficient permissions');
        }
        next();
    };
};
exports.authorize = authorize;
const generateTokens = (payload) => {
    const accessToken = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ ...payload, tokenVersion: Date.now() }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiresIn });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.config.jwt.refreshSecret);
};
exports.verifyRefreshToken = verifyRefreshToken;
/** Verify a short-lived access token (used for REST + socket handshake). */
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errorHandler_1.AuthenticationError('Token expired');
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new errorHandler_1.AuthenticationError('Invalid token');
        }
        throw error;
    }
};
exports.verifyAccessToken = verifyAccessToken;
//# sourceMappingURL=auth.js.map