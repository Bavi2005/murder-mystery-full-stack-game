import crypto from 'crypto';

// RFC 6238 TOTP implementation using Node's built-in crypto.
// No external dependencies; base32 per RFC 4648.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTOTPSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

function hotp(secret: Buffer, counter: number): number {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return code % 1_000_000;
}

export function totp(secret: string, timestamp = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const code = hotp(base32Decode(secret), counter);
  return code.toString().padStart(6, '0');
}

/** Verify a 6-digit code allowing a configurable window of steps around now. */
export function verifyTOTP(secret: string, code: string, windowSteps = 1, timestamp = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const stepSeconds = 30;
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  for (let i = -windowSteps; i <= windowSteps; i++) {
    const candidate = hotp(base32Decode(secret), counter + i).toString().padStart(6, '0');
    const a = Buffer.from(candidate);
    const b = Buffer.from(code);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }
  return false;
}

export function otpauthUrl(secret: string, account: string, issuer = 'Mystery Mansion'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
