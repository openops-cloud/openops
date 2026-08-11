import { LessThan } from 'typeorm';

type Row = Record<string, unknown>;

const codeRows: Row[] = [];
const pendingRows: Row[] = [];
const refreshRows: Row[] = [];

type QueryBuilderStub = {
  delete: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  execute: jest.Mock;
};

const clientQueryBuilder: QueryBuilderStub = {
  delete: jest.fn(),
  where: jest.fn(),
  andWhere: jest.fn(),
  execute: jest.fn(),
};

const clientRepo = {
  createQueryBuilder: jest.fn(() => clientQueryBuilder),
};

const grantQueryBuilder: QueryBuilderStub = {
  delete: jest.fn(),
  where: jest.fn(),
  andWhere: jest.fn(),
  execute: jest.fn(),
};

const grantRepo = {
  createQueryBuilder: jest.fn(() => grantQueryBuilder),
};

function isFindOperator(value: unknown): value is { value: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.constructor.name === 'FindOperator'
  );
}

// Only `LessThan` is used by the cleanup job. Compared as instants, because the service
// binds cutoffs as `Date` objects — see `oauth-query.ts`.
function matches(row: Row, criteria: Row): boolean {
  return Object.entries(criteria).every(([key, expected]) => {
    if (isFindOperator(expected)) {
      const actual = row[key];
      if (typeof actual !== 'string') {
        return false;
      }
      const cutoff = expected.value;
      if (!(cutoff instanceof Date)) {
        throw new Error(`expected a Date cutoff for ${key}`);
      }
      return new Date(actual).getTime() < cutoff.getTime();
    }
    return row[key] === expected;
  });
}

function makeRepo(store: Row[]) {
  return () => ({
    delete: async (criteria: Row) => {
      const survivors = store.filter((row) => !matches(row, criteria));
      const affected = store.length - survivors.length;
      store.length = 0;
      store.push(...survivors);
      return { affected };
    },
  });
}

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  repoFactory: (entity: { options: { name: string } }) => {
    switch (entity.options.name) {
      case 'oauth_authorization_code':
        return makeRepo(codeRows);
      case 'oauth_pending_authorization':
        return makeRepo(pendingRows);
      case 'oauth_refresh_token':
        return makeRepo(refreshRows);
      case 'oauth_client':
        return () => clientRepo;
      case 'oauth_grant':
        return () => grantRepo;
      default:
        throw new Error(`unexpected entity ${entity.options.name}`);
    }
  },
}));

const loggerInfo = jest.fn();

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: { info: loggerInfo, warn: jest.fn(), error: jest.fn() },
}));

import {
  OAUTH_CLEANUP_CRON,
  oauthCleanupJobHandler,
} from '../../../src/app/oauth/oauth-cleanup-job';

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function isoInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

describe('oauthCleanupJobHandler', () => {
  beforeEach(() => {
    codeRows.length = 0;
    pendingRows.length = 0;
    refreshRows.length = 0;
    jest.clearAllMocks();
    clientQueryBuilder.delete.mockReturnValue(clientQueryBuilder);
    clientQueryBuilder.where.mockReturnValue(clientQueryBuilder);
    clientQueryBuilder.andWhere.mockReturnValue(clientQueryBuilder);
    clientQueryBuilder.execute.mockResolvedValue({ affected: 2 });
    grantQueryBuilder.delete.mockReturnValue(grantQueryBuilder);
    grantQueryBuilder.where.mockReturnValue(grantQueryBuilder);
    grantQueryBuilder.andWhere.mockReturnValue(grantQueryBuilder);
    grantQueryBuilder.execute.mockResolvedValue({ affected: 1 });
  });

  it('deletes only dead connections: no live refresh token and unused for long enough', async () => {
    await oauthCleanupJobHandler();

    expect(grantQueryBuilder.execute).toHaveBeenCalled();
    const [dateClause, dateParams] = grantQueryBuilder.where.mock.calls[0];
    expect(dateClause).toContain('COALESCE("lastUsedAt", "created")');
    expect(dateParams.cutoff).toBeInstanceOf(Date);
    expect((dateParams.cutoff as Date).getTime()).toBeLessThan(Date.now());
    // A connection with any unrevoked refresh token is still live and must survive.
    expect(grantQueryBuilder.andWhere.mock.calls[0][0]).toContain(
      'NOT EXISTS (SELECT 1 FROM oauth_refresh_token t WHERE t."grantId" = oauth_grant.id AND t."revokedAt" IS NULL)',
    );
  });

  it('reports how many dead connections it removed', async () => {
    await oauthCleanupJobHandler();

    expect(loggerInfo).toHaveBeenCalledWith(
      'OAuth cleanup completed',
      expect.objectContaining({ deadGrants: 1 }),
    );
  });

  it('runs hourly', () => {
    expect(OAUTH_CLEANUP_CRON).toBe('0 * * * *');
  });

  it('deletes expired authorization codes and keeps live ones', async () => {
    codeRows.push(
      { id: 'expired-code', expiresAt: isoDaysAgo(1) },
      { id: 'live-code', expiresAt: isoInMinutes(1) },
    );

    await oauthCleanupJobHandler();

    expect(codeRows.map((row) => row.id)).toEqual(['live-code']);
  });

  it('deletes expired pending authorizations and keeps live ones', async () => {
    pendingRows.push(
      { id: 'expired-pending', expiresAt: isoDaysAgo(1) },
      { id: 'live-pending', expiresAt: isoInMinutes(10) },
    );

    await oauthCleanupJobHandler();

    expect(pendingRows.map((row) => row.id)).toEqual(['live-pending']);
  });

  it('deletes refresh tokens that can no longer be rotated', async () => {
    refreshRows.push(
      { id: 'expired-token', expiresAt: isoDaysAgo(1), revokedAt: null },
      { id: 'live-token', expiresAt: isoDaysAgo(-30), revokedAt: null },
    );

    await oauthCleanupJobHandler();

    expect(refreshRows.map((row) => row.id)).toEqual(['live-token']);
  });

  it('keeps revoked refresh tokens until they expire, however long ago they were rotated', async () => {
    refreshRows.push(
      {
        id: 'revoked-long-ago-still-valid',
        expiresAt: isoDaysAgo(-20),
        revokedAt: isoDaysAgo(25),
      },
      {
        id: 'revoked-recently',
        expiresAt: isoDaysAgo(-20),
        revokedAt: isoDaysAgo(1),
      },
      {
        id: 'revoked-and-expired',
        expiresAt: isoDaysAgo(1),
        revokedAt: isoDaysAgo(25),
      },
      {
        id: 'never-revoked',
        expiresAt: isoDaysAgo(-20),
        revokedAt: null,
      },
    );

    await oauthCleanupJobHandler();

    // A row survives while its token could still be presented, which is the window in
    // which a replay must be recognised as reuse rather than an unknown token.
    expect(refreshRows.map((row) => row.id)).toEqual([
      'revoked-long-ago-still-valid',
      'revoked-recently',
      'never-revoked',
    ]);
  });

  it('deletes old public clients that no grant references, via a NOT EXISTS subquery', async () => {
    await oauthCleanupJobHandler();

    expect(clientQueryBuilder.execute).toHaveBeenCalledTimes(1);

    const whereClauses = [
      ...clientQueryBuilder.where.mock.calls,
      ...clientQueryBuilder.andWhere.mock.calls,
    ];
    const clauseSql = whereClauses.map((call) => call[0] as string).join(' | ');

    expect(clauseSql).toContain('"created" <');
    expect(clauseSql).toContain('"tokenEndpointAuthMethod" =');
    expect(clauseSql).toContain('NOT EXISTS');
    expect(clauseSql).toContain('oauth_grant');

    const parameters = Object.assign(
      {},
      ...whereClauses.map((call) => call[1] ?? {}),
    ) as Record<string, unknown>;

    expect(parameters.authMethod).toBe('none');
    // Bound as a Date, so the driver serialises it the way it serialises stored values.
    expect(parameters.cutoff).toBeInstanceOf(Date);
    const cutoffAge = Date.now() - (parameters.cutoff as Date).getTime();
    expect(cutoffAge).toBeGreaterThan(29 * DAY_MS);
    expect(cutoffAge).toBeLessThan(31 * DAY_MS);
  });

  it('logs a single summary with the deleted counts', async () => {
    codeRows.push({ id: 'expired-code', expiresAt: isoDaysAgo(1) });
    pendingRows.push({ id: 'expired-pending', expiresAt: isoDaysAgo(1) });
    refreshRows.push(
      { id: 'expired-token', expiresAt: isoDaysAgo(1), revokedAt: null },
      {
        id: 'revoked-long-ago',
        expiresAt: isoDaysAgo(-30),
        revokedAt: isoDaysAgo(8),
      },
    );

    await oauthCleanupJobHandler();

    expect(loggerInfo).toHaveBeenCalledTimes(1);
    expect(loggerInfo.mock.calls[0][1]).toEqual({
      authorizationCodes: 1,
      pendingAuthorizations: 1,
      expiredRefreshTokens: 1,
      unusedClients: 2,
      deadGrants: 1,
    });
  });

  it('exposes value on a LessThan find operator, which the store mock relies on', () => {
    expect(LessThan('2020-01-01').value).toBe('2020-01-01');
  });
});
