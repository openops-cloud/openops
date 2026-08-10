import { openOpsId } from '@openops/shared';
import { IsNull } from 'typeorm';
import { repoFactory } from '../../core/db/repo-factory';
import { invalidRequest } from '../common/oauth-errors';
import { OAuthPendingAuthorization } from '../storage/oauth-model';
import { earlierThan } from '../storage/oauth-query';
import { OAuthPendingAuthorizationEntity } from '../storage/oauth.entity';

const repo = repoFactory<OAuthPendingAuthorization>(
  OAuthPendingAuthorizationEntity,
);

// RFC 6749 §4.1.1 gives no bound: long enough to log in and read the consent screen,
// short enough to limit the window in which a leaked request id is useful.
export const PENDING_AUTHORIZATION_TTL_MS = 10 * 60 * 1000;

// Unknown, expired and already-consumed all report this same text, so the endpoint is not
// an oracle for which request ids exist.
const UNUSABLE_REQUEST = 'unknown or expired authorization request';

export type CreatePendingAuthorizationParams = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  scope: string;
  state: string | null;
};

function isExpired(record: OAuthPendingAuthorization, now: number): boolean {
  return new Date(record.expiresAt).getTime() <= now;
}

export const pendingAuthorizationService = {
  /**
   * Stores the parameters `/authorize` already validated, so the browser cannot re-supply
   * — and tamper with — any of them. The returned id is the only handle it carries.
   */
  async create(params: CreatePendingAuthorizationParams): Promise<string> {
    const id = openOpsId();
    const now = new Date();

    await repo().insert({
      id,
      created: now.toISOString(),
      updated: now.toISOString(),
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      resource: params.resource,
      scope: params.scope,
      state: params.state,
      expiresAt: new Date(
        now.getTime() + PENDING_AUTHORIZATION_TTL_MS,
      ).toISOString(),
      consumedAt: null,
    });

    return id;
  },

  async get(id: string): Promise<OAuthPendingAuthorization> {
    const record = await repo().findOneBy({ id });

    if (
      !record ||
      record.consumedAt !== null ||
      isExpired(record, Date.now())
    ) {
      throw invalidRequest(UNUSABLE_REQUEST);
    }

    return record;
  },

  /**
   * The conditional update is the single-use guarantee: concurrent submissions race on
   * `consumedAt IS NULL` in the database, so only one can mint an authorization code.
   */
  async consume(id: string): Promise<OAuthPendingAuthorization> {
    const consumedAt = new Date().toISOString();
    // Some drivers report `affected` as null; anything but one claimed row means another
    // request already took it.
    const result = await repo().update(
      { id, consumedAt: IsNull() },
      { consumedAt },
    );

    if (result.affected !== 1) {
      throw invalidRequest(UNUSABLE_REQUEST);
    }

    const record = await repo().findOneBy({ id });

    if (!record || isExpired(record, new Date(consumedAt).getTime())) {
      throw invalidRequest(UNUSABLE_REQUEST);
    }

    return record;
  },

  /** Cleanup job hook. Takes a `Date`, never an ISO string — see `earlierThan`. */
  async deleteExpired(now = new Date()): Promise<number> {
    const result = await repo().delete({ expiresAt: earlierThan(now) });

    return result.affected ?? 0;
  },
};
