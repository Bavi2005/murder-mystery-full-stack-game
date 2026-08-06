"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crypto_1 = require("./crypto");
(0, vitest_1.describe)('envelope crypto (AES-256-GCM)', () => {
    const envelope = { suspectId: 's1', weaponId: 'w2', roomId: 'kitchen' };
    (0, vitest_1.it)('round-trips an envelope', () => {
        const enc = (0, crypto_1.encryptEnvelope)(envelope);
        (0, vitest_1.expect)(enc).toContain('.');
        (0, vitest_1.expect)((0, crypto_1.decryptEnvelope)(enc)).toEqual(envelope);
    });
    (0, vitest_1.it)('produces unique ciphertexts each time (random IV)', () => {
        (0, vitest_1.expect)((0, crypto_1.encryptEnvelope)(envelope)).not.toBe((0, crypto_1.encryptEnvelope)(envelope));
    });
    (0, vitest_1.it)('never leaks plaintext in the payload', () => {
        const enc = (0, crypto_1.encryptEnvelope)(envelope);
        (0, vitest_1.expect)(enc).not.toContain('kitchen');
        (0, vitest_1.expect)(enc).not.toContain('s1');
    });
    (0, vitest_1.it)('rejects tampered ciphertext (GCM tag check)', () => {
        const enc = (0, crypto_1.encryptEnvelope)(envelope);
        const [iv, tag, data] = enc.split('.');
        const flipped = Buffer.from(data, 'base64');
        flipped[0] ^= 0xff;
        const tampered = [iv, tag, flipped.toString('base64')].join('.');
        (0, vitest_1.expect)(() => (0, crypto_1.decryptEnvelope)(tampered)).toThrow();
    });
    (0, vitest_1.it)('rejects malformed payloads', () => {
        (0, vitest_1.expect)(() => (0, crypto_1.decryptEnvelope)('garbage')).toThrow();
        (0, vitest_1.expect)(() => (0, crypto_1.decryptEnvelope)('a.b')).toThrow();
        (0, vitest_1.expect)(() => (0, crypto_1.decryptEnvelope)('')).toThrow();
    });
});
(0, vitest_1.describe)('safeEqual — constant-time comparison', () => {
    (0, vitest_1.it)('matches equal strings', () => {
        (0, vitest_1.expect)((0, crypto_1.safeEqual)('secret123', 'secret123')).toBe(true);
    });
    (0, vitest_1.it)('rejects mismatches', () => {
        (0, vitest_1.expect)((0, crypto_1.safeEqual)('secret123', 'secret124')).toBe(false);
        (0, vitest_1.expect)((0, crypto_1.safeEqual)('short', 'a much longer string')).toBe(false);
        (0, vitest_1.expect)((0, crypto_1.safeEqual)('abc', 'abd')).toBe(false);
    });
});
//# sourceMappingURL=crypto.test.js.map