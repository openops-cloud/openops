import { logger } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { IsNull } from 'typeorm';
import { repoFactory } from '../../core/db/repo-factory';
import { invalidGrant } from '../common/oauth-errors';
import { OAuthGrant, OAuthRefreshToken } from '../storage/oauth-model';
import {
  OAuthGrantEntity,
  OAuthRefreshTokenEntity,
} from '../storage/oauth.entity';

const grantRepo = repoFactory<OAuthGrant>(OAuthGrantEntity);
const refreshTokenRepo = repoFactory<OAuthRefreshToken>(
  OAuthRefreshTokenEntity,
);

const GRANT_SNAPSHOT_CACHE_TTL_MS = 60 * 1000;
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;

/**
 * One authorized connection. Refresh rotation, token exchange and request
 * authentication all consult it, so revoking the row kills that connection alone.
 */
export type GrantSnapshot = {
  id: string;
  userId: string;
  clientId: string;
  status: OAuthGrant['status'];
};

type CachedSnapshot = {
  snapshot: GrantSnapshot | undefined;
  fetchedAt: number;
};

// Access tokens are self-contained, so the grant is re-checked per request; the cache
// keeps that off the hot path and bounds revocation latency to the TTL.
const snapshotCache = new Map<string, CachedSnapshot>();

const lastUsedWrittenAt = new Map<string, number>();

// Both maps are keyed by grant id and nothing evicts a key once its window passes, so
// reconnecting agents would grow them for the life of the process. Both are pure
// optimizations, so sweeping only past any real working set is enough.
const CACHE_SWEEP_THRESHOLD = 10_000;

function remember<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  isExpired: (entry: T) => boolean,
): void {
  if (cache.size >= CACHE_SWEEP_THRESHOLD) {
    for (const [existingKey, entry] of cache) {
      if (isExpired(entry)) {
        cache.delete(existingKey);
      }
    }

    // Still oversized means the entries are live; bound the memory rather than the
    // query count, since correctness does not depend on them.
    if (cache.size >= CACHE_SWEEP_THRESHOLD) {
      cache.clear();
    }
  }

  cache.set(key, value);
}

function toSnapshot(grant: OAuthGrant): GrantSnapshot {
  return {
    id: grant.id,
    userId: grant.userId,
    clientId: grant.clientId,
    status: grant.status,
  };
}

function invalidateSnapshot(grantId: string): void {
  snapshotCache.delete(grantId);
}

export type CreateGrantParams = {
  clientId: string;
  userId: string;
  resourceId: string;
};

export const grantsService = {
  /**
   * One grant per completed authorization, so the same agent can be connected more than
   * once. Called at code redemption, not at consent: an authorization the client never
   * completed is not a connection.
   */
  async create(params: CreateGrantParams): Promise<OAuthGrant> {
    const now = new Date().toISOString();

    const grant: OAuthGrant = {
      id: openOpsId(),
      created: now,
      updated: now,
      clientId: params.clientId,
      userId: params.userId,
      resourceId: params.resourceId,
      status: 'active',
      lastUsedAt: null,
      revokedAt: null,
    };

    await grantRepo().insert(grant);

    return grant;
  },

  async getGrantSnapshot(grantId: string): Promise<GrantSnapshot | undefined> {
    const cached = snapshotCache.get(grantId);
    if (cached && Date.now() - cached.fetchedAt < GRANT_SNAPSHOT_CACHE_TTL_MS) {
      return cached.snapshot;
    }

    const grant = await grantRepo().findOneBy({ id: grantId });
    const snapshot = grant ? toSnapshot(grant) : undefined;
    remember(
      snapshotCache,
      grantId,
      { snapshot, fetchedAt: Date.now() },
      (entry) => Date.now() - entry.fetchedAt >= GRANT_SNAPSHOT_CACHE_TTL_MS,
    );

    return snapshot;
  },

  async getActiveGrantOrThrow(grantId: string): Promise<GrantSnapshot> {
    const snapshot = await grantsService.getGrantSnapshot(grantId);

    if (snapshot?.status !== 'active') {
      throw invalidGrant('the authorization for this client has been revoked');
    }

    return snapshot;
  },

  /**
   * Revokes one connection and every refresh token under it — without the cascade the
   * client could keep minting access tokens by refreshing. Other connections for the
   * same user and client are untouched.
   */
  async revoke(grantId: string): Promise<void> {
    const now = new Date().toISOString();

    await grantRepo().update(
      { id: grantId },
      { status: 'revoked', revokedAt: now, updated: now },
    );
    await refreshTokenRepo().update(
      { grantId, revokedAt: IsNull() },
      { revokedAt: now, updated: now },
    );

    invalidateSnapshot(grantId);
    logger.info('OAuth grant revoked', { grantId });
  },

  async revokeForUser(grantId: string, userId: string): Promise<void> {
    const grant = await grantRepo().findOneBy({ id: grantId, userId });

    if (!grant) {
      throw invalidGrant('unknown grant');
    }

    await grantsService.revoke(grantId);
  },

  async listForUser(userId: string): Promise<OAuthGrant[]> {
    return grantRepo().find({
      where: { userId, status: 'active' },
      order: { created: 'DESC' },
    });
  },

  /** Throttled: it would otherwise write on every API call made through a connection. */
  async touch(grantId: string): Promise<void> {
    const now = Date.now();
    const writtenAt = lastUsedWrittenAt.get(grantId);

    if (
      writtenAt !== undefined &&
      now - writtenAt < LAST_USED_WRITE_INTERVAL_MS
    ) {
      return;
    }

    remember(
      lastUsedWrittenAt,
      grantId,
      now,
      (writtenAtEntry) => now - writtenAtEntry >= LAST_USED_WRITE_INTERVAL_MS,
    );
    await grantRepo().update(
      { id: grantId },
      { lastUsedAt: new Date(now).toISOString() },
    );
  },

  clearSnapshotCacheForTests(): void {
    snapshotCache.clear();
    lastUsedWrittenAt.clear();
  },

  snapshotCacheSizeForTests(): number {
    return snapshotCache.size;
  },
};
