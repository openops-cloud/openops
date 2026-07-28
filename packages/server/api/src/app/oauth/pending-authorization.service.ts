import { openOpsId } from '@openops/shared';
import { IsNull } from 'typeorm';
import { repoFactory } from '../core/db/repo-factory';
import { invalidRequest } from './oauth-errors';
import { OAuthPendingAuthorization } from './oauth-model';
import { earlierThan } from './oauth-query';
import { OAuthPendingAuthorizationEntity } from './oauth.entity';

const repo = repoFactory<OAuthPendingAuthorization>(
  OAuthPendingAuthorizationEntity,
);

/** RFC 6749 §4.1.1 gives no bound; ten minutes is long enough to log in and
 * read the consent screen, short enough to limit the window in which a leaked
 * request id is useful. */
export const PENDING_AUTHORIZATION_TTL_MS = 10 * 60 * 1000;

/**
 * Unknown, expired and already-consumed requests are all reported with this
 * exact text: a distinguishable error would turn the consent endpoint into an
 * oracle for which request ids exist.
 */
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
   * Stores the parameters `/authorize` has already validated so nothing about
   * the request can be re-supplied — and therefore tampered with — by the
   * browser. The id is a 21-char nanoid (~125 bits of entropy), unguessable
   * enough to be the sole handle the user agent carries, and it fits the
   * varchar(21) id column.
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

  /** Read-only lookup for rendering the consent screen. */
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
   * Claims the request for the decision that is being submitted. The
   * conditional update is the single-use guarantee: two concurrent submissions
   * race on `consumedAt IS NULL` in the database, so exactly one can ever
   * proceed to mint an authorization code.
   */
  async consume(id: string): Promise<OAuthPendingAuthorization> {
    const consumedAt = new Date().toISOString();
    // Some drivers report `affected` as null/undefined; anything but a single
    // claimed row means another request already took it.
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

  /**
   * Cleanup job hook: expired requests can never be used again. Takes a `Date` so
   * the driver serialises the comparison the same way it serialised the stored
   * value; an ISO string is compared textually by drivers that store a different
   * textual format, which matches every row.
   */
  async deleteExpired(now = new Date()): Promise<number> {
    const result = await repo().delete({ expiresAt: earlierThan(now) });

    return result.affected ?? 0;
  },
};
