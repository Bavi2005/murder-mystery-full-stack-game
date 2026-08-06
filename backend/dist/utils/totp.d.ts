export declare function base32Encode(buffer: Buffer): string;
export declare function base32Decode(input: string): Buffer;
export declare function generateTOTPSecret(bytes?: number): string;
export declare function totp(secret: string, timestamp?: number, stepSeconds?: number): string;
/** Verify a 6-digit code allowing a configurable window of steps around now. */
export declare function verifyTOTP(secret: string, code: string, windowSteps?: number, timestamp?: number): boolean;
export declare function otpauthUrl(secret: string, account: string, issuer?: string): string;
//# sourceMappingURL=totp.d.ts.map