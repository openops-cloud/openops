import { logger } from '@openops/server-shared';
import { repoFactory } from '../core/db/repo-factory';
import { systemJobsSchedule } from '../helper/system-jobs';
import { SystemJobName } from '../helper/system-jobs/common';
import { systemJobHandlers } from '../helper/system-jobs/job-handlers';
import { pendingAuthorizationService } from './authorization/pending-authorization.service';
import { oauthConfig } from './config/oauth-config';
import {
  OAuthAuthorizationCode,
  OAuthClient,
  OAuthGrant,
  OAuthRefreshToken,
} from './storage/oauth-model';
import { earlierThan } from './storage/oauth-query';
import {
  OAuthAuthorizationCodeEntity,
  OAuthClientEntity,
  OAuthGrantEntity,
  OAuthRefreshTokenEntity,
} from './storage/oauth.entity';

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
 * Registered even when OAuth is disabled: the schedule lives in Redis and outlives the
 * process, so an install that turned OAuth off still has this job firing, and a missing
 * handler means hourly `No handler for job` retries.
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

// How long a grant with no usable refresh token stays in the connected-apps list; a
// client that reconnects rather than refreshing would otherwise leave a trail of rows.
const DEAD_GRANT_RETENTION_DAYS = 30;

export const oauthCleanupJobHandler = async (): Promise<void> => {
  const now = Date.now();
  // The query-builder parameters below are bound as Dates, never ISO strings — the
  // reason is in `earlierThan`.
  const nowDate = new Date(now);
  const clientCutoff = new Date(now - UNUSED_CLIENT_RETENTION_DAYS * DAY_MS);
  const deadGrantCutoff = new Date(now - DEAD_GRANT_RETENTION_DAYS * DAY_MS);

  const authorizationCodes = await codeRepo().delete({
    expiresAt: earlierThan(nowDate),
  });
  const pendingAuthorizations =
    await pendingAuthorizationService.deleteExpired(nowDate);
  // Expiry is the only anchor, revoked rows included: keeping a rotated token until it
  // could no longer be used anyway is what lets reuse detection still recognise a replay
  // as a compromise rather than a plain `invalid refresh token`.
  const expiredRefreshTokens = await refreshTokenRepo().delete({
    expiresAt: earlierThan(nowDate),
  });

  // `NOT EXISTS` keeps this one statement rather than loading every grant to filter in
  // memory. The `none` auth method also spares the resource-server client, which must
  // survive regardless of age.
  const unusedClients = await clientRepo()
    .createQueryBuilder()
    .delete()
    .where('"created" < :cutoff', { cutoff: clientCutoff })
    .andWhere('"tokenEndpointAuthMethod" = :authMethod', { authMethod: 'none' })
    .andWhere(
      'NOT EXISTS (SELECT 1 FROM oauth_grant g WHERE g."clientId" = oauth_client.id)',
    )
    .execute();

  // After the refresh-token deletes above, so a grant whose tokens just went counts as
  // dead in the same pass.
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
