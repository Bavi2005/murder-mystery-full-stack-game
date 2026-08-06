"use strict";
// In-memory brute-force protection for authentication endpoints.
// Single-process deployment (one backend container), so an in-memory map is
// sufficient. Tracks failures per (email) and per (ip).
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoginLocked = isLoginLocked;
exports.recordLoginFailure = recordLoginFailure;
exports.clearLoginFailures = clearLoginFailures;
exports.secondsUntilUnlock = secondsUntilUnlock;
exports.resetLoginGuard = resetLoginGuard;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const emailFailures = new Map();
const ipFailures = new Map();
function sweep() {
    const now = Date.now();
    for (const [k, v] of emailFailures) {
        if (now - v.lockedUntil > WINDOW_MS && v.count === 0)
            emailFailures.delete(k);
    }
}
function isLoginLocked(email, ip) {
    sweep();
    const now = Date.now();
    for (const entry of [emailFailures.get(email.toLowerCase()), ipFailures.get(ip)]) {
        if (entry && entry.lockedUntil > now)
            return true;
    }
    return false;
}
function recordLoginFailure(email, ip) {
    sweep();
    const now = Date.now();
    const bump = (map, key) => {
        const entry = map.get(key) || { count: 0, lockedUntil: 0 };
        entry.count += 1;
        if (entry.count >= MAX_ATTEMPTS) {
            entry.count = 0;
            entry.lockedUntil = now + LOCK_MS;
        }
        map.set(key, entry);
    };
    bump(emailFailures, email.toLowerCase());
    bump(ipFailures, ip);
}
function clearLoginFailures(email) {
    emailFailures.delete(email.toLowerCase());
}
function secondsUntilUnlock(email, ip) {
    const now = Date.now();
    let max = 0;
    for (const entry of [emailFailures.get(email.toLowerCase()), ipFailures.get(ip)]) {
        if (entry && entry.lockedUntil > now)
            max = Math.max(max, entry.lockedUntil - now);
    }
    return Math.ceil(max / 1000);
}
/** Test-only: wipe all in-memory state. */
function resetLoginGuard() {
    emailFailures.clear();
    ipFailures.clear();
}
//# sourceMappingURL=loginGuard.js.map