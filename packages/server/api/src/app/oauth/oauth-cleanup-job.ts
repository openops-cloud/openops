import { logger } from '@openops/server-shared';
import { repoFactory } from '../core/db/repo-factory';
import { systemJobsSchedule } from '../helper/system-jobs';
import { SystemJobName } from '../helper/system-jobs/common';
import { systemJobHandlers } from '../helper/system-jobs/job-handlers';
import { oauthConfig } from './oauth-config';
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

/**
 * Registered on every boot, including when OAuth is disabled.
 *
 * The schedule lives in Redis and outlives the process that created it, so a deployment
 * that enabled OAuth once and later turned it off still has this job firing. Without a
 * handler the worker throws `No handler for job`, and BullMQ retries — an hourly failure
 * for a feature nobody is using. Registering unconditionally costs a map entry.
 */
export const registerOAuthCleanupHandler = (): void => {
  systemJobHandlers.registerJobHandler(
    SystemJobName.OAUTH_CLEANUP,
    async (): Promise<void> => {
      if (!oauthConfig.isEnabled()) {
        return;
      }

      try {
        await oauthCleanupJobHandler();
      } catch (error) {
        // Logged rather than rethrown so one bad run does not stop the schedule.
        logger.error('OAuth cleanup job failed', error);
      }
    },
  );
};

export const scheduleOAuthCleanupJob = async (): Promise<void> => {
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
  const clientCutoff = new Date(now - UNUSED_CLIENT_RETENTION_DAYS * DAY_MS);
  const deadGrantCutoff = new Date(now - DEAD_GRANT_RETENTION_DAYS * DAY_MS);

  const authorizationCodes = await codeRepo().delete({
    expiresAt: earlierThan(nowDate),
  });
  const pendingAuthorizations = await pendingAuthorizationService.deleteExpired(
    nowDate,
  );
  /*
   * Expiry is the only anchor, for revoked rows as much as live ones.
   *
   * A rotated token stays in the table until the moment it could no longer be used
   * anyway, which is what lets reuse detection recognise a replay for as long as a
   * replay could plausibly succeed. An independent, shorter window would mean a token
   * replayed after it lapsed came back as a plain `invalid refresh token`: rejected, but
   * with no family revocation and no security log line — the compromise signal lost
   * precisely because the token was old.
   *
   * The cost is bounded by the refresh TTL, so this cannot grow without limit.
   */
  const expiredRefreshTokens = await refreshTokenRepo().delete({
    expiresAt: earlierThan(nowDate),
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
    unusedClients: unusedClients.affected ?? 0,
    deadGrants: deadGrants.affected ?? 0,
  });
};
