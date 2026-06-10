import { getStandardRetryAfterMs, HttpHeaders } from '@openops/blocks-common';

describe('getStandardRetryAfterMs', () => {
  test.each<[string, HttpHeaders, number]>([
    ['a delta-seconds value', { 'retry-after': '120' }, 120000],
    ['a case-insensitive header name', { 'Retry-After': '5' }, 5000],
    [
      'a delta-seconds value capped at 10 minutes',
      { 'retry-after': '99999' },
      600000,
    ],
    [
      'the first element of a string-array value',
      { 'retry-after': ['120'] },
      120000,
    ],
  ])('parses %s', (_label, headers, expected) => {
    expect(getStandardRetryAfterMs(headers)).toBe(expected);
  });

  test.each<[string, HttpHeaders | undefined]>([
    ['zero or negative seconds', { 'retry-after': '0' }],
    ['an unparseable value', { 'retry-after': 'soon' }],
    ['an empty-array value', { 'retry-after': [] }],
    [
      'an HTTP-date in the past',
      { 'retry-after': new Date(Date.now() - 10000).toUTCString() },
    ],
    ['an absent header', {}],
    ['undefined headers', undefined],
  ])('returns undefined for %s', (_label, headers) => {
    expect(getStandardRetryAfterMs(headers)).toBeUndefined();
  });

  test('parses an HTTP-date in the future as a positive delay', () => {
    const tenSecondsFromNow = new Date(Date.now() + 10000).toUTCString();
    const result = getStandardRetryAfterMs({
      'retry-after': tenSecondsFromNow,
    });
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(10000);
  });
});
