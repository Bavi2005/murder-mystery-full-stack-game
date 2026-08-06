import { describe, it, expect } from 'vitest';
import { encryptEnvelope, decryptEnvelope, safeEqual } from './crypto';

describe('envelope crypto (AES-256-GCM)', () => {
  const envelope = { suspectId: 's1', weaponId: 'w2', roomId: 'kitchen' };

  it('round-trips an envelope', () => {
    const enc = encryptEnvelope(envelope);
    expect(enc).toContain('.');
    expect(decryptEnvelope<typeof envelope>(enc)).toEqual(envelope);
  });

  it('produces unique ciphertexts each time (random IV)', () => {
    expect(encryptEnvelope(envelope)).not.toBe(encryptEnvelope(envelope));
  });

  it('never leaks plaintext in the payload', () => {
    const enc = encryptEnvelope(envelope);
    expect(enc).not.toContain('kitchen');
    expect(enc).not.toContain('s1');
  });

  it('rejects tampered ciphertext (GCM tag check)', () => {
    const enc = encryptEnvelope(envelope);
    const [iv, tag, data] = enc.split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;
    const tampered = [iv, tag, flipped.toString('base64')].join('.');
    expect(() => decryptEnvelope(tampered)).toThrow();
  });

  it('rejects malformed payloads', () => {
    expect(() => decryptEnvelope('garbage')).toThrow();
    expect(() => decryptEnvelope('a.b')).toThrow();
    expect(() => decryptEnvelope('')).toThrow();
  });
});

describe('safeEqual — constant-time comparison', () => {
  it('matches equal strings', () => {
    expect(safeEqual('secret123', 'secret123')).toBe(true);
  });

  it('rejects mismatches', () => {
    expect(safeEqual('secret123', 'secret124')).toBe(false);
    expect(safeEqual('short', 'a much longer string')).toBe(false);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
});
