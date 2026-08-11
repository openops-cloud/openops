import crypto from 'node:crypto';

const TOKEN_BYTES = 32;

export function generateOpaqueToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Hashed first so differing lengths cannot leak timing information
// (`crypto.timingSafeEqual` throws on length mismatch).
export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashedA = crypto.createHash('sha256').update(a).digest();
  const hashedB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashedA, hashedB);
}
