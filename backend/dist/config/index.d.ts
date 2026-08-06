export declare const config: {
    nodeEnv: string;
    port: number;
    database: {
        url: string;
    };
    redis: {
        url: string;
        host: string;
        port: number;
        password: string;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    frontend: {
        url: string;
    };
    bcrypt: {
        rounds: number;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    cors: {
        origin: string;
    };
    cookie: {
        secret: string;
    };
    encryption: {
        key: string;
    };
};
//# sourceMappingURL=index.d.ts.map