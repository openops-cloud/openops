import crypto from 'node:crypto';
import { isValidCodeChallenge, verifyPkce } from '../../../src/app/oauth/pkce';

const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = crypto
  .createHash('sha256')
  .update(VERIFIER)
  .digest('base64url');

describe('verifyPkce', () => {
  it('accepts a verifier whose S256 digest matches the challenge', () => {
    expect(verifyPkce(VERIFIER, CHALLENGE)).toBe(true);
  });

  it('rejects a mismatched verifier', () => {
    expect(verifyPkce(`${VERIFIER.slice(0, -1)}X`, CHALLENGE)).toBe(false);
  });

  it('rejects a plain-method verifier equal to the challenge', () => {
    expect(verifyPkce(CHALLENGE, CHALLENGE)).toBe(false);
  });

  it.each([
    ['too short', 'short'],
    ['too long', 'a'.repeat(129)],
    ['illegal characters', `${'a'.repeat(42)}$`],
    ['empty', ''],
  ])('rejects a verifier that is %s', (_label, verifier) => {
    expect(verifyPkce(verifier, CHALLENGE)).toBe(false);
  });
});

describe('isValidCodeChallenge', () => {
  it('accepts a 43-char base64url challenge', () => {
    expect(isValidCodeChallenge(CHALLENGE)).toBe(true);
  });

  it.each([
    ['wrong length', 'abc'],
    ['base64 padding', `${'a'.repeat(42)}=`],
    ['non-base64url characters', `${'a'.repeat(42)}+`],
  ])('rejects a challenge with %s', (_label, challenge) => {
    expect(isValidCodeChallenge(challenge)).toBe(false);
  });
});
