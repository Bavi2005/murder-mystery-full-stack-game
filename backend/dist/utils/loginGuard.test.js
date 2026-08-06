"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const loginGuard_1 = require("./loginGuard");
(0, vitest_1.describe)('loginGuard — brute force protection', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers();
        (0, loginGuard_1.resetLoginGuard)();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
        (0, loginGuard_1.resetLoginGuard)();
    });
    (0, vitest_1.it)('allows attempts under the threshold', () => {
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(false);
        for (let i = 0; i < 4; i++)
            (0, loginGuard_1.recordLoginFailure)('a@b.com', '1.2.3.4');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(false);
    });
    (0, vitest_1.it)('locks after 5 failed attempts', () => {
        for (let i = 0; i < 5; i++)
            (0, loginGuard_1.recordLoginFailure)('a@b.com', '1.2.3.4');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(true);
        (0, vitest_1.expect)((0, loginGuard_1.secondsUntilUnlock)('a@b.com', '1.2.3.4')).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('locks an IP across different emails', () => {
        (0, loginGuard_1.recordLoginFailure)('a@b.com', '9.9.9.9');
        (0, loginGuard_1.recordLoginFailure)('c@d.com', '9.9.9.9');
        (0, loginGuard_1.recordLoginFailure)('e@f.com', '9.9.9.9');
        (0, loginGuard_1.recordLoginFailure)('g@h.com', '9.9.9.9');
        (0, loginGuard_1.recordLoginFailure)('i@j.com', '9.9.9.9');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('x@y.com', '9.9.9.9')).toBe(true);
    });
    (0, vitest_1.it)('locks an email across different IPs', () => {
        for (let i = 0; i < 5; i++)
            (0, loginGuard_1.recordLoginFailure)('a@b.com', `1.1.1.${i}`);
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '2.2.2.2')).toBe(true);
    });
    (0, vitest_1.it)('unlocks after the lock window expires', () => {
        for (let i = 0; i < 5; i++)
            (0, loginGuard_1.recordLoginFailure)('a@b.com', '1.2.3.4');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(true);
        vitest_1.vi.advanceTimersByTime(16 * 60 * 1000);
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(false);
    });
    (0, vitest_1.it)('successful login clears the email-level lock', () => {
        for (let i = 0; i < 5; i++)
            (0, loginGuard_1.recordLoginFailure)('a@b.com', '1.2.3.4');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '9.9.9.9')).toBe(true); // email locked
        (0, loginGuard_1.clearLoginFailures)('a@b.com');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '9.9.9.9')).toBe(false);
        // the offending IP stays locked for its own window
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(true);
    });
    (0, vitest_1.it)('is case-insensitive on emails', () => {
        (0, loginGuard_1.recordLoginFailure)('A@B.com', '1.2.3.4');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(false); // only 1 failure
        for (let i = 0; i < 4; i++)
            (0, loginGuard_1.recordLoginFailure)('A@B.com', '1.2.3.4');
        (0, vitest_1.expect)((0, loginGuard_1.isLoginLocked)('a@b.com', '1.2.3.4')).toBe(true);
    });
});
//# sourceMappingURL=loginGuard.test.js.map