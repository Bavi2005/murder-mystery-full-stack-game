export declare function encryptEnvelope<T>(plain: T): string;
export declare function decryptEnvelope<T>(payload: string): T;
/** Compare two strings in constant time to avoid timing side-channels. */
export declare function safeEqual(a: string, b: string): boolean;
//# sourceMappingURL=crypto.d.ts.map