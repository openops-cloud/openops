import {
  generateOpaqueToken,
  sha256Hex,
  timingSafeStringEqual,
} from '../../../src/app/oauth/oauth-crypto';

describe('oauth-crypto', () => {
  it('generates unique 43-char base64url tokens (32 bytes of entropy)', () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => generateOpaqueToken()),
    );

    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('hashes with SHA-256 to stable lowercase hex', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abd')).not.toBe(sha256Hex('abc'));
  });

  it('compares equal strings safely', () => {
    expect(timingSafeStringEqual('same-secret', 'same-secret')).toBe(true);
  });

  it('returns false for unequal strings without throwing on length mismatch', () => {
    expect(timingSafeStringEqual('a', 'ab')).toBe(false);
    expect(timingSafeStringEqual('', 'nonempty')).toBe(false);
    expect(timingSafeStringEqual('secret', 'Secret')).toBe(false);
  });
});
