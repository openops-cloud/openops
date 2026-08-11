type Row = Record<string, unknown>;

const grantRows: Row[] = [];
const refreshTokenRows: Row[] = [];

function matches(row: Row, criteria: Row): boolean {
  return Object.entries(criteria).every(([key, value]) => {
    if (value instanceof Object && value.constructor.name === 'FindOperator') {
      // The only operator used in this service is IsNull().
      return row[key] === null || row[key] === undefined;
    }
    return row[key] === value;
  });
}

function makeRepo(store: Row[]) {
  return () => ({
    find: async (options?: { where?: Row }) =>
      store.filter((row) => matches(row, options?.where ?? {})),
    findOneBy: async (criteria: Row) =>
      store.find((row) => matches(row, criteria)) ?? null,
    insert: async (row: Row) => {
      // No uniqueness on (clientId, userId): repeat authorizations are separate
      // connections.
      store.push(row);
    },
    save: async (row: Row) => {
      const index = store.findIndex((existing) => existing.id === row.id);
      if (index >= 0) {
        store[index] = { ...store[index], ...row };
        return store[index];
      }
      store.push(row);
      return row;
    },
    update: async (criteria: Row, patch: Row) => {
      const targets = store.filter((row) => matches(row, criteria));
      for (const target of targets) {
        Object.assign(target, patch);
      }
      return { affected: targets.length };
    },
  });
}

jest.mock('../../../../src/app/core/db/repo-factory', () => ({
  repoFactory: (entity: { options: { name: string } }) =>
    entity.options.name === 'oauth_grant'
      ? makeRepo(grantRows)
      : makeRepo(refreshTokenRows),
}));

import { grantsService } from '../../../../src/app/oauth/clients/grants.service';

const BASE_PARAMS = {
  clientId: 'client-1',
  userId: 'user-1',
  resourceId: 'mcp',
};

function seedRefreshToken(overrides: Row = {}): Row {
  const row: Row = {
    id: `refresh-${refreshTokenRows.length + 1}`,
    tokenHash: `hash-${refreshTokenRows.length + 1}`,
    grantId: 'grant-1',
    familyId: 'family-1',
    clientId: 'client-1',
    resource: 'https://ops.example.com/mcp',
    scope: 'mcp',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    revokedAt: null,
    ...overrides,
  };
  refreshTokenRows.push(row);
  return row;
}

describe('grantsService', () => {
  beforeEach(() => {
    grantRows.length = 0;
    refreshTokenRows.length = 0;
    grantsService.clearSnapshotCacheForTests();
  });

  describe('create', () => {
    it('creates an active grant on the default project', async () => {
      const grant = await grantsService.create(BASE_PARAMS);

      expect(grantRows).toHaveLength(1);
      expect(grant).toMatchObject({
        clientId: 'client-1',
        userId: 'user-1',
        resourceId: 'mcp',
        status: 'active',
        revokedAt: null,
      });
      // A scope column would restate resourceId, since each resource grants exactly one.
      expect('scope' in (grantRows[0] as object)).toBe(false);
    });

    it('creates an independent grant each time the same client is authorized', async () => {
      const first = await grantsService.create(BASE_PARAMS);
      const second = await grantsService.create(BASE_PARAMS);

      expect(second.id).not.toBe(first.id);
      expect(grantRows).toHaveLength(2);
      expect(grantRows.every((row) => row.status === 'active')).toBe(true);
    });

    it('revoking one connection leaves the user other connections intact', async () => {
      const first = await grantsService.create(BASE_PARAMS);
      const second = await grantsService.create(BASE_PARAMS);
      const firstToken = seedRefreshToken({ grantId: first.id });
      const secondToken = seedRefreshToken({ grantId: second.id });

      await grantsService.revoke(first.id);

      expect(await grantsService.getGrantSnapshot(first.id)).toMatchObject({
        status: 'revoked',
      });
      expect(await grantsService.getGrantSnapshot(second.id)).toMatchObject({
        status: 'active',
      });
      expect(firstToken.revokedAt).toEqual(expect.any(String));
      expect(secondToken.revokedAt).toBeNull();
    });

    it('records no project on the grant', async () => {
      const grant = await grantsService.create(BASE_PARAMS);

      // A connection can switch project, so it belongs to the credential chain (the
      // refresh token). A copy here could only be where the connection started.
      expect('projectId' in (grant as object)).toBe(false);
      expect(
        'setActiveProject' in (grantsService as Record<string, unknown>),
      ).toBe(false);
    });

    it('creates separate grants per client and per user', async () => {
      await grantsService.create(BASE_PARAMS);
      await grantsService.create({
        ...BASE_PARAMS,
        clientId: 'client-2',
      });
      await grantsService.create({
        ...BASE_PARAMS,
        userId: 'user-2',
      });

      expect(grantRows).toHaveLength(3);
    });
  });

  describe('revoke', () => {
    it('marks the grant revoked and cascades to its unrevoked refresh tokens', async () => {
      const grant = await grantsService.create(BASE_PARAMS);
      const tokenA = seedRefreshToken({ grantId: grant.id });
      const tokenB = seedRefreshToken({ grantId: grant.id });
      const otherGrantToken = seedRefreshToken({ grantId: 'other-grant' });

      await grantsService.revoke(grant.id);

      expect(grantRows[0]).toMatchObject({ status: 'revoked' });
      expect(grantRows[0].revokedAt).toEqual(expect.any(String));
      expect(tokenA.revokedAt).toEqual(expect.any(String));
      expect(tokenB.revokedAt).toEqual(expect.any(String));
      expect(otherGrantToken.revokedAt).toBeNull();
    });

    it('leaves an already-revoked token timestamp untouched', async () => {
      const grant = await grantsService.create(BASE_PARAMS);
      const earlier = '2020-01-01T00:00:00.000Z';
      const alreadyRevoked = seedRefreshToken({
        grantId: grant.id,
        revokedAt: earlier,
      });

      await grantsService.revoke(grant.id);

      expect(alreadyRevoked.revokedAt).toBe(earlier);
    });

    it('busts the snapshot cache so revocation takes effect immediately', async () => {
      const grant = await grantsService.create(BASE_PARAMS);
      await grantsService.getGrantSnapshot(grant.id);

      await grantsService.revoke(grant.id);

      expect(await grantsService.getGrantSnapshot(grant.id)).toMatchObject({
        status: 'revoked',
      });
      await expect(
        grantsService.getActiveGrantOrThrow(grant.id),
      ).rejects.toThrow('revoked');
    });
  });

  describe('revokeForUser', () => {
    it('revokes a grant the user owns', async () => {
      const grant = await grantsService.create(BASE_PARAMS);

      await grantsService.revokeForUser(grant.id, 'user-1');

      expect(grantRows[0]).toMatchObject({ status: 'revoked' });
    });

    it("refuses to revoke another user's grant", async () => {
      const grant = await grantsService.create(BASE_PARAMS);

      await expect(
        grantsService.revokeForUser(grant.id, 'attacker'),
      ).rejects.toThrow('unknown grant');
      expect(grantRows[0]).toMatchObject({ status: 'active' });
    });
  });

  describe('getGrantSnapshot', () => {
    it('returns undefined for an unknown grant', async () => {
      expect(await grantsService.getGrantSnapshot('missing')).toBeUndefined();
    });

    it('serves repeated reads from cache without hitting the store again', async () => {
      const grant = await grantsService.create(BASE_PARAMS);
      await grantsService.getGrantSnapshot(grant.id);

      // Mutate the row behind the service's back; the cached read must not see it.
      grantRows[0].status = 'revoked';

      expect(await grantsService.getGrantSnapshot(grant.id)).toMatchObject({
        status: 'active',
      });

      grantsService.clearSnapshotCacheForTests();

      expect(await grantsService.getGrantSnapshot(grant.id)).toMatchObject({
        status: 'revoked',
      });
    });

    it('drops expired entries instead of growing forever', async () => {
      // Each reconnect creates a new grant, and nothing evicts a key once its window
      // passes, so without a sweep the map grows for the life of the process.
      const grant = await grantsService.create(BASE_PARAMS);
      await grantsService.getGrantSnapshot(grant.id);

      // Past the sweep threshold with ids never read again, as short-lived connections
      // would leave behind.
      for (let i = 0; i < 10_000; i++) {
        await grantsService.getGrantSnapshot(`departed-grant-${i}`);
      }

      // Every entry above is now stale, so the next insert sweeps them.
      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + 61_000);
      await grantsService.getGrantSnapshot('one-more');
      nowSpy.mockRestore();

      expect(grantsService.snapshotCacheSizeForTests()).toBeLessThan(10_000);
    });

    it('bounds the cache even when every entry is still live', async () => {
      // A sweep frees nothing if the working set really is that large; the cache is an
      // optimization, so memory is bounded ahead of the query count.
      for (let i = 0; i < 10_001; i++) {
        await grantsService.getGrantSnapshot(`live-grant-${i}`);
      }

      expect(grantsService.snapshotCacheSizeForTests()).toBeLessThanOrEqual(
        10_000,
      );
    });

    it('re-reads once the cache entry expires', async () => {
      const grant = await grantsService.create(BASE_PARAMS);
      await grantsService.getGrantSnapshot(grant.id);
      grantRows[0].status = 'revoked';

      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + 61_000);

      expect(await grantsService.getGrantSnapshot(grant.id)).toMatchObject({
        status: 'revoked',
      });

      nowSpy.mockRestore();
    });
  });

  describe('getActiveGrantOrThrow', () => {
    it('returns the snapshot for an active grant', async () => {
      const grant = await grantsService.create(BASE_PARAMS);

      expect(await grantsService.getActiveGrantOrThrow(grant.id)).toMatchObject(
        {
          id: grant.id,
          userId: 'user-1',
          status: 'active',
        },
      );
    });

    it('throws for an unknown grant', async () => {
      await expect(
        grantsService.getActiveGrantOrThrow('missing'),
      ).rejects.toThrow('revoked');
    });
  });

  describe('listForUser', () => {
    it('lists only the active grants belonging to the user', async () => {
      const mine = await grantsService.create(BASE_PARAMS);
      await grantsService.create({
        ...BASE_PARAMS,
        userId: 'user-2',
        clientId: 'client-2',
      });
      const revoked = await grantsService.create({
        ...BASE_PARAMS,
        clientId: 'client-3',
      });
      await grantsService.revoke(revoked.id);

      const grants = await grantsService.listForUser('user-1');

      expect(grants.map((grant) => grant.id)).toEqual([mine.id]);
    });
  });

  describe('touch', () => {
    it('records last usage on the first call', async () => {
      const grant = await grantsService.create(BASE_PARAMS);

      await grantsService.touch(grant.id);

      expect(grantRows[0].lastUsedAt).toEqual(expect.any(String));
    });

    it('throttles repeated writes within the interval', async () => {
      const grant = await grantsService.create(BASE_PARAMS);
      await grantsService.touch(grant.id);
      const firstWrite = grantRows[0].lastUsedAt;

      grantRows[0].lastUsedAt = 'sentinel';
      await grantsService.touch(grant.id);

      expect(grantRows[0].lastUsedAt).toBe('sentinel');
      expect(firstWrite).toEqual(expect.any(String));
    });

    it('writes again once the interval has passed', async () => {
      const grant = await grantsService.create(BASE_PARAMS);
      await grantsService.touch(grant.id);
      grantRows[0].lastUsedAt = 'sentinel';

      const nowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + 61_000);
      await grantsService.touch(grant.id);
      nowSpy.mockRestore();

      expect(grantRows[0].lastUsedAt).not.toBe('sentinel');
    });
  });
});
