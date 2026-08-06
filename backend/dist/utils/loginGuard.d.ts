export declare function isLoginLocked(email: string, ip: string): boolean;
export declare function recordLoginFailure(email: string, ip: string): void;
export declare function clearLoginFailures(email: string): void;
export declare function secondsUntilUnlock(email: string, ip: string): number;
/** Test-only: wipe all in-memory state. */
export declare function resetLoginGuard(): void;
//# sourceMappingURL=loginGuard.d.ts.map