import { OAuthError } from '../../../src/app/oauth/oauth-errors';
import { OAuthPendingAuthorization } from '../../../src/app/oauth/oauth-model';

type PendingRow = OAuthPendingAuthorization;

const rows: PendingRow[] = [];

type Criteria = Record<string, unknown>;

/**
 * `consumedAt: IsNull()` arrives as a TypeORM `FindOperator`, not a primitive.
 * Honouring it here is what makes the single-use / concurrency assertions real:
 * a mock that ignored the criterion would report every update as affecting a
 * row and the anti-replay tests would pass vacuously.
 */
function matches(row: PendingRow, criteria: Criteria): boolean {
  return Object.entries(criteria).every(([key, value]) => {
    const actual = row[key as keyof PendingRow];

    if (typeof value === 'string') {
      return actual === value;
    }

    const operator = value as { type?: string; value?: unknown };
    if (operator?.type === 'isNull') {
      return actual === null;
    }
    if (operator?.type === 'lessThan') {
      // Compared as instants: the service binds the cutoff as a `Date`.
      const cutoff = operator.value;
      if (!(cutoff instanceof Date)) {
        throw new Error(`expected a Date cutoff for ${key}`);
      }
      return (
        typeof actual === 'string' &&
        new Date(actual).getTime() < cutoff.getTime()
      );
    }

    throw new Error(`unsupported criteria for ${key}`);
  });
}

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  repoFactory: () => () => ({
    insert: async (row: PendingRow) => {
      rows.push({ ...row });
    },
    findOneBy: async (criteria: Criteria) =>
      rows.find((row) => matches(row, criteria)) ?? null,
    update: async (criteria: Criteria, patch: Partial<PendingRow>) => {
      const targets = rows.filter((row) => matches(row, criteria));
      targets.forEach((row) => Object.assign(row, patch));
      return { affected: targets.length };
    },
    delete: async (criteria: Criteria) => {
      const targets = rows.filter((row) => matches(row, criteria));
      targets.forEach((row) => rows.splice(rows.indexOf(row), 1));
      return { affected: targets.length };
    },
  }),
}));

import {
  PENDING_AUTHORIZATION_TTL_MS,
  pendingAuthorizationService,
} from '../../../src/app/oauth/pending-authorization.service';

const params = {
  clientId: 'client-abc',
  redirectUri: 'https://app.example.com/callback',
  codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  resource: 'https://ops.example.com/api',
  scope: 'openops:read openops:write',
  state: 'opaque-state',
};

function seedRow(overrides: Partial<PendingRow>): PendingRow {
  const now = new Date().toISOString();
  const row: PendingRow = {
    id: 'seeded00000000000000A',
    created: now,
    updated: now,
    ...params,
    expiresAt: new Date(
      Date.now() + PENDING_AUTHORIZATION_TTL_MS,
    ).toISOString(),
    consumedAt: null,
    ...overrides,
  };
  rows.push(row);
  return row;
}

async function descriptionOfRejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(OAuthError);
    return (error as OAuthError).description;
  }
  throw new Error('expected the promise to reject');
}

describe('pendingAuthorizationService', () => {
  beforeEach(() => {
    rows.length = 0;
  });

  describe('create', () => {
    it('persists every supplied parameter unmodified', async () => {
      const id = await pendingAuthorizationService.create(params);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id, ...params, consumedAt: null });
    });

    it('returns an unguessable 21-character id', async () => {
      const id = await pendingAuthorizationService.create(params);

      expect(id).toHaveLength(21);
      expect(id).toMatch(/^[0-9a-zA-Z]{21}$/);
    });

    it('expires the request ten minutes after creation', async () => {
      const before = Date.now();
      await pendingAuthorizationService.create(params);

      const expiresAt = new Date(rows[0].expiresAt).getTime();

      expect(PENDING_AUTHORIZATION_TTL_MS).toBe(10 * 60 * 1000);
      expect(expiresAt).toBeGreaterThanOrEqual(
        before + PENDING_AUTHORIZATION_TTL_MS - 5000,
      );
      expect(expiresAt).toBeLessThanOrEqual(
        Date.now() + PENDING_AUTHORIZATION_TTL_MS + 5000,
      );
    });

    it('issues a distinct id per request', async () => {
      const first = await pendingAuthorizationService.create(params);
      const second = await pendingAuthorizationService.create(params);

      expect(first).not.toBe(second);
    });
  });

  describe('get', () => {
    it('round-trips every validated parameter', async () => {
      const id = await pendingAuthorizationService.create(params);

      const record = await pendingAuthorizationService.get(id);

      expect(record.id).toBe(id);
      expect(record.clientId).toBe(params.clientId);
      expect(record.redirectUri).toBe(params.redirectUri);
      expect(record.codeChallenge).toBe(params.codeChallenge);
      expect(record.resource).toBe(params.resource);
      expect(record.scope).toBe(params.scope);
      expect(record.state).toBe(params.state);
      expect(record.consumedAt).toBeNull();
    });

    it('round-trips a null state', async () => {
      const id = await pendingAuthorizationService.create({
        ...params,
        state: null,
      });

      const record = await pendingAuthorizationService.get(id);

      expect(record.state).toBeNull();
    });

    it('rejects an unknown id', async () => {
      await expect(
        pendingAuthorizationService.get('doesNotExist00000000'),
      ).rejects.toBeInstanceOf(OAuthError);
    });

    it('rejects a record whose expiry has passed', async () => {
      const row = seedRow({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });

      await expect(pendingAuthorizationService.get(row.id)).rejects.toThrow(
        'invalid_request',
      );
    });

    it('rejects an already-consumed record', async () => {
      const row = seedRow({ consumedAt: new Date().toISOString() });

      await expect(pendingAuthorizationService.get(row.id)).rejects.toThrow(
        'invalid_request',
      );
    });

    it('reports unknown, expired and consumed identically so ids cannot be probed', async () => {
      const expired = seedRow({
        id: 'expired0000000000000',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      const consumed = seedRow({
        id: 'consumed000000000000',
        consumedAt: new Date().toISOString(),
      });

      const unknownDescription = await descriptionOfRejection(
        pendingAuthorizationService.get('unknown00000000000000'),
      );
      const expiredDescription = await descriptionOfRejection(
        pendingAuthorizationService.get(expired.id),
      );
      const consumedDescription = await descriptionOfRejection(
        pendingAuthorizationService.get(consumed.id),
      );

      expect(expiredDescription).toBe(unknownDescription);
      expect(consumedDescription).toBe(unknownDescription);
    });
  });

  describe('consume', () => {
    it('returns the record and stamps consumedAt on the stored row', async () => {
      const id = await pendingAuthorizationService.create(params);

      const record = await pendingAuthorizationService.consume(id);

      expect(record.id).toBe(id);
      expect(record.clientId).toBe(params.clientId);
      expect(record.redirectUri).toBe(params.redirectUri);
      expect(record.codeChallenge).toBe(params.codeChallenge);
      expect(rows[0].consumedAt).toEqual(expect.any(String));
      expect(new Date(rows[0].consumedAt as string).getTime()).not.toBeNaN();
    });

    it('is single-use: a replayed consume of the same id is rejected', async () => {
      const id = await pendingAuthorizationService.create(params);

      await pendingAuthorizationService.consume(id);

      await expect(pendingAuthorizationService.consume(id)).rejects.toThrow(
        'invalid_request',
      );
    });

    it('lets exactly one of two concurrent consumes succeed', async () => {
      const id = await pendingAuthorizationService.create(params);

      const results = await Promise.allSettled([
        pendingAuthorizationService.consume(id),
        pendingAuthorizationService.consume(id),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
    });

    it('rejects an expired record even though it was never consumed', async () => {
      const row = seedRow({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });

      await expect(pendingAuthorizationService.consume(row.id)).rejects.toThrow(
        'invalid_request',
      );
    });

    it('rejects an unknown id with the same description as a replay', async () => {
      const id = await pendingAuthorizationService.create(params);
      await pendingAuthorizationService.consume(id);

      const replayDescription = await descriptionOfRejection(
        pendingAuthorizationService.consume(id),
      );
      const unknownDescription = await descriptionOfRejection(
        pendingAuthorizationService.consume('unknown00000000000000'),
      );

      expect(replayDescription).toBe(unknownDescription);
    });
  });

  describe('deleteExpired', () => {
    it('removes only past-expiry rows and reports how many it deleted', async () => {
      seedRow({
        id: 'expiredA000000000000',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });
      seedRow({
        id: 'expiredB000000000000',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      const live = seedRow({ id: 'liveRow00000000000000' });

      const deleted = await pendingAuthorizationService.deleteExpired();

      expect(deleted).toBe(2);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(live.id);
    });

    it('deletes nothing when every row is still live', async () => {
      seedRow({ id: 'liveA0000000000000000' });
      seedRow({ id: 'liveB0000000000000000' });

      const deleted = await pendingAuthorizationService.deleteExpired();

      expect(deleted).toBe(0);
      expect(rows).toHaveLength(2);
    });

    it('honours an explicit cutoff so a consumed-but-live row can be swept later', async () => {
      const soon = seedRow({
        id: 'soon00000000000000000',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      });

      const deleted = await pendingAuthorizationService.deleteExpired(
        new Date(Date.now() + 60_000),
      );

      expect(deleted).toBe(1);
      expect(rows.some((row) => row.id === soon.id)).toBe(false);
    });
  });
});
