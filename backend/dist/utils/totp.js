"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.base32Encode = base32Encode;
exports.base32Decode = base32Decode;
exports.generateTOTPSecret = generateTOTPSecret;
exports.totp = totp;
exports.verifyTOTP = verifyTOTP;
exports.otpauthUrl = otpauthUrl;
const crypto_1 = __importDefault(require("crypto"));
// RFC 6238 TOTP implementation using Node's built-in crypto.
// No external dependencies; base32 per RFC 4648.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buffer) {
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
function base32Decode(input) {
    const clean = input.toUpperCase().replace(/[\s=]/g, '');
    const bytes = [];
    let bits = 0;
    let value = 0;
    for (const char of clean) {
        const idx = BASE32_ALPHABET.indexOf(char);
        if (idx === -1)
            continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}
function generateTOTPSecret(bytes = 20) {
    return base32Encode(crypto_1.default.randomBytes(bytes));
}
function hotp(secret, counter) {
    const counterBuf = Buffer.alloc(8);
    counterBuf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto_1.default.createHmac('sha1', secret).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    return code % 1_000_000;
}
function totp(secret, timestamp = Date.now(), stepSeconds = 30) {
    const counter = Math.floor(timestamp / 1000 / stepSeconds);
    const code = hotp(base32Decode(secret), counter);
    return code.toString().padStart(6, '0');
}
/** Verify a 6-digit code allowing a configurable window of steps around now. */
function verifyTOTP(secret, code, windowSteps = 1, timestamp = Date.now()) {
    if (!/^\d{6}$/.test(code))
        return false;
    const stepSeconds = 30;
    const counter = Math.floor(timestamp / 1000 / stepSeconds);
    for (let i = -windowSteps; i <= windowSteps; i++) {
        const candidate = hotp(base32Decode(secret), counter + i).toString().padStart(6, '0');
        const a = Buffer.from(candidate);
        const b = Buffer.from(code);
        if (a.length === b.length && crypto_1.default.timingSafeEqual(a, b)) {
            return true;
        }
    }
    return false;
}
function otpauthUrl(secret, account, issuer = 'Mystery Mansion') {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
//# sourceMappingURL=totp.js.map