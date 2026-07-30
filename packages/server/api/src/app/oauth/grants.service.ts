import { logger } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { IsNull } from 'typeorm';
import { repoFactory } from '../core/db/repo-factory';
import { invalidGrant } from './oauth-errors';
import { OAuthGrant, OAuthRefreshToken } from './oauth-model';
import { OAuthGrantEntity, OAuthRefreshTokenEntity } from './oauth.entity';

const grantRepo = repoFactory<OAuthGrant>(OAuthGrantEntity);
const refreshTokenRepo = repoFactory<OAuthRefreshToken>(
  OAuthRefreshTokenEntity,
);

const GRANT_SNAPSHOT_CACHE_TTL_MS = 60 * 1000;
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;

/**
 * One authorized connection: a single completed authorization for one client and
 * user. Everything that can revoke access keys off this row, so revoking it
 * reliably kills that connection and only that connection — refresh rotation,
 * token exchange and API request authentication all consult it.
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

/**
 * Access tokens are self-contained, so revocation is enforced by checking the
 * grant on each request. The cache keeps that off the hot path while bounding
 * revocation latency to the TTL.
 */
const snapshotCache = new Map<string, CachedSnapshot>();

/** Last time `lastUsedAt` was written, per grant, to throttle those writes. */
const lastUsedWrittenAt = new Map<string, number>();

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
   * Records a newly authorized connection.
   *
   * Every completed authorization gets its own grant, so a user can connect the
   * same agent more than once and have each connection live and be revoked
   * independently. Created at code redemption rather than at consent, so an
   * authorization the client never completed does not appear as a connection.
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
    snapshotCache.set(grantId, { snapshot, fetchedAt: Date.now() });

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
   * Revokes one connection and every refresh token issued under it. Revoking the
   * grant alone would leave the client able to mint new access tokens by
   * refreshing, so the cascade is part of the same operation. Other connections
   * belonging to the same user and client are untouched.
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

  /**
   * Records usage, which is also how a user tells their connections apart in the
   * connected-apps list. Throttled because it would otherwise write on every
   * single API call made through a connection.
   */
  async touch(grantId: string): Promise<void> {
    const now = Date.now();
    const writtenAt = lastUsedWrittenAt.get(grantId);

    if (
      writtenAt !== undefined &&
      now - writtenAt < LAST_USED_WRITE_INTERVAL_MS
    ) {
      return;
    }

    lastUsedWrittenAt.set(grantId, now);
    await grantRepo().update(
      { id: grantId },
      { lastUsedAt: new Date(now).toISOString() },
    );
  },

  clearSnapshotCacheForTests(): void {
    snapshotCache.clear();
    lastUsedWrittenAt.clear();
  },
};
