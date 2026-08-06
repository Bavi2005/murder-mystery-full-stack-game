export declare const generateToken: (length?: number) => string;
export declare const generateNumericCode: (length?: number) => string;
export declare const slugify: (text: string) => string;
export declare const truncate: (text: string, length: number) => string;
export declare const formatDate: (date: Date, format?: string) => string;
export declare const parseDuration: (duration: string) => number;
export declare const sleep: (ms: number) => Promise<void>;
export declare const retry: <T>(fn: () => Promise<T>, retries?: number, delay?: number) => Promise<T>;
export declare const chunkArray: <T>(array: T[], size: number) => T[][];
export declare const shuffleArray: <T>(array: T[]) => T[];
export declare const pickRandom: <T>(array: T[], count: number) => T[];
export declare const calculateDistance: (pos1: {
    x: number;
    y: number;
}, pos2: {
    x: number;
    y: number;
}) => number;
export declare const isInRange: (pos1: {
    x: number;
    y: number;
}, pos2: {
    x: number;
    y: number;
}, range: number) => boolean;
//# sourceMappingURL=helpers.d.ts.map