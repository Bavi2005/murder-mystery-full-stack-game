"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptEnvelope = encryptEnvelope;
exports.decryptEnvelope = decryptEnvelope;
exports.safeEqual = safeEqual;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
// Minimal authenticated-encryption helper used to store the secret solution
// envelope at rest so a leaked DB dump never reveals the answer.
function getKey() {
    // Derive a 32-byte key from the configured ENCRYPTION_KEY using SHA-256.
    const secret = config_1.config.encryption.key || '32_char_encryption_key_change_me';
    return crypto_1.default.createHash('sha256').update(secret).digest();
}
function encryptEnvelope(plain) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', getKey(), iv);
    const data = Buffer.from(JSON.stringify(plain), 'utf8');
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}
function decryptEnvelope(payload) {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64)
        throw new Error('Invalid envelope payload');
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
}
/** Compare two strings in constant time to avoid timing side-channels. */
function safeEqual(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length)
        return false;
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
//# sourceMappingURL=crypto.js.map