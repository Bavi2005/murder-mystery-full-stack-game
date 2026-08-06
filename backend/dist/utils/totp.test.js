"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const totp_1 = require("./totp");
// RFC 6238 Appendix B test vectors (secret = "12345678901234567890" → base32 GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ)
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
(0, vitest_1.describe)('TOTP (RFC 6238)', () => {
    (0, vitest_1.it)('matches RFC test vectors', () => {
        const vectors = [
            [59, '287082'],
            [1111111109, '081804'],
            [1111111111, '050471'],
            [1234567890, '005924'],
            [2000000000, '279037'],
        ];
        for (const [t, expected] of vectors) {
            (0, vitest_1.expect)((0, totp_1.totp)(SECRET, t * 1000)).toBe(expected);
        }
    });
    (0, vitest_1.it)('accepts a valid code within the window', () => {
        const now = Date.now();
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(SECRET, (0, totp_1.totp)(SECRET, now))).toBe(true);
    });
    (0, vitest_1.it)('accepts codes one step in the past/future', () => {
        const now = Date.now();
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(SECRET, (0, totp_1.totp)(SECRET, now - 30_000))).toBe(true);
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(SECRET, (0, totp_1.totp)(SECRET, now + 30_000))).toBe(true);
    });
    (0, vitest_1.it)('rejects a wrong code', () => {
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(SECRET, '000000')).toBe(false);
    });
    (0, vitest_1.it)('rejects malformed codes', () => {
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(SECRET, '12345')).toBe(false);
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(SECRET, 'abcdef')).toBe(false);
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(SECRET, '1234567')).toBe(false);
    });
    (0, vitest_1.it)('generates a valid 32-char base32 secret', () => {
        const secret = (0, totp_1.generateTOTPSecret)();
        (0, vitest_1.expect)(secret).toMatch(/^[A-Z2-7]{32}$/);
        (0, vitest_1.expect)((0, totp_1.verifyTOTP)(secret, (0, totp_1.totp)(secret))).toBe(true);
    });
    (0, vitest_1.it)('produces a proper otpauth URL', () => {
        const url = (0, totp_1.otpauthUrl)(SECRET, 'a@b.com');
        (0, vitest_1.expect)(url).toContain('otpauth://totp/');
        (0, vitest_1.expect)(url).toContain('secret=');
        (0, vitest_1.expect)(url).toContain('issuer=');
    });
    (0, vitest_1.it)('base32 round-trips', () => {
        const data = Buffer.from('Mystery Mansion');
        (0, vitest_1.expect)((0, totp_1.base32Decode)((0, totp_1.base32Encode)(data)).toString()).toBe('Mystery Mansion');
    });
});
//# sourceMappingURL=totp.test.js.map