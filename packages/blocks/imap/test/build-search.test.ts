import dayjs from 'dayjs';
import { buildImapSearch } from '../src/lib/common/build-search';

describe('buildImapSearch', () => {
  const FIXED_NOW_ISO = '2025-09-22T11:57:00.000Z';

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FIXED_NOW_ISO));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  test('sets since to 7 days before now when lastEpochMilliSeconds is 0', () => {
    const res = buildImapSearch({ lastEpochMilliSeconds: 0 });
    expect(res.since).toBe(dayjs().subtract(7, 'days').toISOString());
  });

  test('sets since to ISO string when lastEpochMilliSeconds is non-zero', () => {
    const ts = 1695657600000;
    const res = buildImapSearch({ lastEpochMilliSeconds: ts });
    expect(res.since).toBe(dayjs(ts).toISOString());
  });

  test('normalizes recipients, cc, and senders (lowercase and trim)', () => {
    const res = buildImapSearch({
      lastEpochMilliSeconds: 0,
      recipients: ['  Alice@Example.com  '],
      cc: ['  Bob@Example.com '],
      senders: ['  Carol@Example.com  '],
    });

    expect(res).toMatchObject({
      to: 'alice@example.com',
      cc: 'bob@example.com',
      from: 'carol@example.com',
    });
    expect(dayjs(res.since).toISOString()).toBe(
      dayjs().subtract(7, 'days').toISOString(),
    );
    expect(res.or).toBeUndefined();
  });

  test('trims subject and only includes when non-empty', () => {
    const withSubject = buildImapSearch({
      lastEpochMilliSeconds: 0,
      subject: '  Quarterly Report  ',
    });
    expect(withSubject.subject).toBe('Quarterly Report');

    const emptySubject = buildImapSearch({
      lastEpochMilliSeconds: 0,
      subject: '   ',
    });
    expect(emptySubject.subject).toBeUndefined();
  });

  test('creates OR clauses when multiple values produce multiple combinations', () => {
    const res = buildImapSearch({
      lastEpochMilliSeconds: 0,
      recipients: ['a@example.com', 'b@example.com'],
      senders: ['sender@example.com'],
    });

    expect(res).toHaveProperty('or');
    expect(Array.isArray(res.or)).toBe(true);
    expect(res.or?.length).toBe(2);

    if (res.or) {
      for (const clause of res.or) {
        expect(clause).toHaveProperty('to');
        expect(clause).toHaveProperty('from', 'sender@example.com');
      }
    }
  });

  test('cross-product across to, cc, and from results in expected number of OR clauses', () => {
    const res = buildImapSearch({
      lastEpochMilliSeconds: 0,
      recipients: ['to1@example.com', 'to2@example.com'],
      cc: ['cc1@example.com'],
      senders: ['from1@example.com', 'from2@example.com'],
    });

    expect(res.or?.length).toBe(4);
    if (res.or) {
      for (const clause of res.or) {
        expect(Object.keys(clause).sort()).toEqual(['cc', 'from', 'to']);
      }
    }
  });
});
