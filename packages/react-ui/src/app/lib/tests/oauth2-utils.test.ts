import { getNonceFromState } from '../oauth2-utils';

describe('getNonceFromState', () => {
  it('returns the nonce when it contains no underscore', () => {
    expect(getNonceFromState('abc123_aHR0cA==')).toBe('abc123');
  });

  it('returns the full nonce when the nonce itself contains underscores', () => {
    expect(getNonceFromState('ab_cd_ef_aHR0cA==')).toBe('ab_cd_ef');
  });

  it('keeps a leading underscore as part of the nonce', () => {
    expect(getNonceFromState('_ab_cd_aHR0cA==')).toBe('_ab_cd');
  });

  it('returns the whole value when there is no separator', () => {
    expect(getNonceFromState('nounderscore')).toBe('nounderscore');
  });

  it('returns null for null, undefined or empty state', () => {
    expect(getNonceFromState(null)).toBeNull();
    expect(getNonceFromState(undefined)).toBeNull();
    expect(getNonceFromState('')).toBeNull();
  });
});
