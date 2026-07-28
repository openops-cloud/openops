import { logger } from '@openops/server-shared';
import { repoFactory } from '../core/db/repo-factory';
import { systemJobsSchedule } from '../helper/system-jobs';
import { SystemJobName } from '../helper/system-jobs/common';
import { systemJobHandlers } from '../helper/system-jobs/job-handlers';
import {
  OAuthAuthorizationCode,
  OAuthClient,
  OAuthGrant,
  OAuthRefreshToken,
} from './oauth-model';
import { earlierThan } from './oauth-query';
import {
  OAuthAuthorizationCodeEntity,
  OAuthClientEntity,
  OAuthGrantEntity,
  OAuthRefreshTokenEntity,
} from './oauth.entity';
import { pendingAuthorizationService } from './pending-authorization.service';

const codeRepo = repoFactory<OAuthAuthorizationCode>(
  OAuthAuthorizationCodeEntity,
);
const refreshTokenRepo = repoFactory<OAuthRefreshToken>(
  OAuthRefreshTokenEntity,
);
const clientRepo = repoFactory<OAuthClient>(OAuthClientEntity);
const grantRepo = repoFactory<OAuthGrant>(OAuthGrantEntity);

export const OAUTH_CLEANUP_CRON = '0 * * * *';

export const registerOAuthCleanupJob = async (): Promise<void> => {
  systemJobHandlers.registerJobHandler(
    SystemJobName.OAUTH_CLEANUP,
    async (): Promise<void> => {
      try {
        await oauthCleanupJobHandler();
      } catch (error) {
        // Logged rather than rethrown so one bad run does not stop the schedule.
        logger.error('OAuth cleanup job failed', error);
      }
    },
  );

  await systemJobsSchedule.upsertJob({
    job: {
      name: SystemJobName.OAUTH_CLEANUP,
      data: {},
    },
    schedule: {
      type: 'repeated',
      cron: OAUTH_CLEANUP_CRON,
    },
  });
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Revoked refresh tokens are kept for a while so rotation reuse detection still
 * has the history it needs to recognize a replay of an old token.
 */
const REVOKED_RETENTION_DAYS = 7;

/** Registration is open to the network, so unused clients must not accumulate. */
const UNUSED_CLIENT_RETENTION_DAYS = 30;

/**
 * How long a dead connection stays in the connected-apps list. Each
 * authorization creates its own grant, so a client that reconnects instead of
 * refreshing would otherwise leave a growing trail of rows the user has to read
 * past. A grant is dead once it has no usable refresh token left.
 */
const DEAD_GRANT_RETENTION_DAYS = 30;

export const oauthCleanupJobHandler = async (): Promise<void> => {
  const now = Date.now();
  // Every cutoff is a Date, never an ISO string: see `earlierThan`. The same
  // applies to the query-builder parameters below, which are bound the same way.
  const nowDate = new Date(now);
  const revokedCutoff = new Date(now - REVOKED_RETENTION_DAYS * DAY_MS);
  const clientCutoff = new Date(now - UNUSED_CLIENT_RETENTION_DAYS * DAY_MS);
  const deadGrantCutoff = new Date(now - DEAD_GRANT_RETENTION_DAYS * DAY_MS);

  const authorizationCodes = await codeRepo().delete({
    expiresAt: earlierThan(nowDate),
  });
  const pendingAuthorizations = await pendingAuthorizationService.deleteExpired(
    nowDate,
  );
  // An expired refresh token can no longer be rotated, so nothing depends on it.
  const expiredRefreshTokens = await refreshTokenRepo().delete({
    expiresAt: earlierThan(nowDate),
  });
  const revokedRefreshTokens = await refreshTokenRepo().delete({
    revokedAt: earlierThan(revokedCutoff),
  });

  // A `NOT EXISTS` subquery keeps this a single statement: loading every grant to
  // filter in memory would not scale with the number of registered clients. The
  // `none` auth method also excludes the provisioned confidential resource-server
  // client, which must survive regardless of age.
  const unusedClients = await clientRepo()
    .createQueryBuilder()
    .delete()
    .where('"created" < :cutoff', { cutoff: clientCutoff })
    .andWhere('"tokenEndpointAuthMethod" = :authMethod', { authMethod: 'none' })
    .andWhere(
      'NOT EXISTS (SELECT 1 FROM oauth_grant g WHERE g."clientId" = oauth_client.id)',
    )
    .execute();

  // Runs after the refresh-token deletes above, so a grant whose tokens have just
  // been cleaned up is recognised as dead in the same pass.
  const deadGrants = await grantRepo()
    .createQueryBuilder()
    .delete()
    .where('COALESCE("lastUsedAt", "created") < :cutoff', {
      cutoff: deadGrantCutoff,
    })
    .andWhere(
      'NOT EXISTS (SELECT 1 FROM oauth_refresh_token t WHERE t."grantId" = oauth_grant.id AND t."revokedAt" IS NULL)',
    )
    .execute();

  logger.info('OAuth cleanup completed', {
    authorizationCodes: authorizationCodes.affected ?? 0,
    pendingAuthorizations,
    expiredRefreshTokens: expiredRefreshTokens.affected ?? 0,
    revokedRefreshTokens: revokedRefreshTokens.affected ?? 0,
    unusedClients: unusedClients.affected ?? 0,
    deadGrants: deadGrants.affected ?? 0,
  });
};
