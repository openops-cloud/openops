import crypto from 'node:crypto';
import { timingSafeStringEqual } from '../common/oauth-crypto';

// RFC 7636 §4.1: 43-128 chars from the unreserved set.
const VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
// A base64url-encoded SHA-256 digest is always 43 chars.
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isValidCodeChallenge(codeChallenge: string): boolean {
  return CHALLENGE_PATTERN.test(codeChallenge);
}

export function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  if (!VERIFIER_PATTERN.test(codeVerifier)) {
    return false;
  }

  const computed = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return timingSafeStringEqual(computed, codeChallenge);
}
