import { describe, it, expect } from 'vitest';
import { generateTOTPSecret, totp, verifyTOTP, otpauthUrl, base32Encode, base32Decode } from './totp';

// RFC 6238 Appendix B test vectors (secret = "12345678901234567890" → base32 GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ)
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP (RFC 6238)', () => {
  it('matches RFC test vectors', () => {
    const vectors: Array<[number, string]> = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
    ];
    for (const [t, expected] of vectors) {
      expect(totp(SECRET, t * 1000)).toBe(expected);
    }
  });

  it('accepts a valid code within the window', () => {
    const now = Date.now();
    expect(verifyTOTP(SECRET, totp(SECRET, now))).toBe(true);
  });

  it('accepts codes one step in the past/future', () => {
    const now = Date.now();
    expect(verifyTOTP(SECRET, totp(SECRET, now - 30_000))).toBe(true);
    expect(verifyTOTP(SECRET, totp(SECRET, now + 30_000))).toBe(true);
  });

  it('rejects a wrong code', () => {
    expect(verifyTOTP(SECRET, '000000')).toBe(false);
  });

  it('rejects malformed codes', () => {
    expect(verifyTOTP(SECRET, '12345')).toBe(false);
    expect(verifyTOTP(SECRET, 'abcdef')).toBe(false);
    expect(verifyTOTP(SECRET, '1234567')).toBe(false);
  });

  it('generates a valid 32-char base32 secret', () => {
    const secret = generateTOTPSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(verifyTOTP(secret, totp(secret))).toBe(true);
  });

  it('produces a proper otpauth URL', () => {
    const url = otpauthUrl(SECRET, 'a@b.com');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('secret=');
    expect(url).toContain('issuer=');
  });

  it('base32 round-trips', () => {
    const data = Buffer.from('Mystery Mansion');
    expect(base32Decode(base32Encode(data)).toString()).toBe('Mystery Mansion');
  });
});
