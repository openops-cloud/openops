import { normalizeClientIp } from '../../../src/app/helper/client-ip';

describe('normalizeClientIp', () => {
  it.each([
    ['34.236.157.72:43148', '34.236.157.72'],
    ['34.236.157.72', '34.236.157.72'],
    ['[2001:db8::1]:43148', '2001:db8::1'],
    ['[2001:db8::1]', '2001:db8::1'],
    ['2001:db8::1', '2001:db8::1'],
    ['::1', '::1'],
    [' 34.236.157.72:43148 ', '34.236.157.72'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeClientIp(input)).toBe(expected);
  });

  it.each([undefined, ''])('returns undefined for %p', (input) => {
    expect(normalizeClientIp(input)).toBeUndefined();
  });
});
