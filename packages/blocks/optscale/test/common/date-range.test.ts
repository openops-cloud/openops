import {
  toUnixDateRange,
  toUnixSeconds,
} from '../../src/lib/common/date-range';

describe('date range helpers', () => {
  test('converts ISO dates to unix seconds', () => {
    expect(toUnixSeconds('2026-01-01T00:00:00.000Z', 'Start Date')).toBe(
      1767225600,
    );
  });

  test('rejects invalid dates', () => {
    expect(() => toUnixSeconds('not-a-date', 'Start Date')).toThrow(
      'Start Date is not a valid date: not-a-date',
    );
  });

  test('builds an OptScale date range', () => {
    expect(
      toUnixDateRange('2026-01-01T00:00:00Z', '2026-01-31T23:59:59Z'),
    ).toEqual({ start_date: 1767225600, end_date: 1769903999 });
  });

  test('rejects a start date after the end date', () => {
    expect(() =>
      toUnixDateRange('2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z'),
    ).toThrow('Start Date must be before End Date');
  });
});
