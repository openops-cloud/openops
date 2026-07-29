import { logger } from '@openops/server-shared';
import { isNil, openOpsId, User, UserStatus } from '@openops/shared';
import { IsNull } from 'typeorm';
import { repoFactory } from '../core/db/repo-factory';
import { userService } from '../user/user-service';
import { grantsService } from './grants.service';
import { oauthConfig } from './oauth-config';
import { generateOpaqueToken, sha256Hex } from './oauth-crypto';
import { invalidGrant, invalidTarget } from './oauth-errors';
import {
  OAuthAuthorizationCode,
  OAuthGrant,
  OAuthPendingAuthorization,
  OAuthRefreshToken,
  OAuthTokenResponse,
} from './oauth-model';
import {
  OAuthAuthorizationCodeEntity,
  OAuthRefreshTokenEntity,
} from './oauth.entity';
import { verifyPkce } from './pkce';
import { getOAuthProjectMembershipService } from './project-membership-factory';
import { resolveResource } from './resource-registry';
import { signingKeyService } from './signing-key.service';

const codeRepo = repoFactory<OAuthAuthorizationCode>(
  OAuthAuthorizationCodeEntity,
);
const refreshTokenRepo = repoFactory<OAuthRefreshToken>(
  OAuthRefreshTokenEntity,
);

const AUTHORIZATION_CODE_TTL_MS = 60 * 1000;

/** Same text for every redemption failure so nothing can be probed by trial. */
const UNUSABLE_CODE = 'invalid or expired authorization code';

function isExpired(timestamp: string, now: number): boolean {
  return new Date(timestamp).getTime() <= now;
}

/**
 * Re-checked on every redemption and rotation so deactivating a user takes
 * effect without waiting for their tokens to expire.
 */
async function loadActiveUserOrThrow(userId: string): Promise<User> {
  const user = await userService.get({ id: userId });

  if (isNil(user) || user.status !== UserStatus.ACTIVE) {
    throw invalidGrant('the user for this authorization is no longer active');
  }

  return user;
}

/** The project a new connection binds to. */
async function resolveDefaultProjectId(user: User): Promise<string> {
  const membership = await getOAuthProjectMembershipService().getDefaultForUser(
    user,
  );

  if (isNil(membership)) {
    throw invalidGrant('the user has no accessible project');
  }

  return membership.projectId;
}

/**
 * Re-authorizes the project before minting. Access to a project can be withdrawn
 * after a connection is made, and refreshing must not hand out a token for a
 * project the user can no longer reach.
 */
async function authorizeProjectOrThrow(
  user: User,
  projectId: string,
  wasRequested = false,
): Promise<string> {
  const membership = await getOAuthProjectMembershipService().getForUser(
    user,
    projectId,
  );

  if (isNil(membership)) {
    // Two different failures. The client naming a project it may not have is
    // `invalid_target` (RFC 8707) — a bad request it can correct. The connection's own
    // project having become unreachable is `invalid_grant`: the authorization is stale
    // and re-authorizing is the only fix.
    throw wasRequested
      ? invalidTarget('the requested project is not accessible')
      : invalidGrant('the project for this authorization is not accessible');
  }

  return membership.projectId;
}

async function mintAccessToken(params: {
  grant: Pick<OAuthGrant, 'id' | 'userId' | 'clientId'>;
  audience: string;
  scope: string;
  projectId: string;
  ttlSeconds: number;
}): Promise<string> {
  return signingKeyService.signAccessToken(
    {
      sub: params.grant.userId,
      aud: params.audience,
      client_id: params.grant.clientId,
      scope: params.scope,
      grant_id: params.grant.id,
      project_id: params.projectId,
    },
    params.ttlSeconds,
  );
}

async function issueRefreshToken(params: {
  grantId: string;
  familyId: string;
  clientId: string;
  resource: string;
  scope: string;
  projectId: string;
}): Promise<string> {
  const token = generateOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + oauthConfig.getRefreshTokenTtlDays() * 24 * 60 * 60 * 1000,
  );

  await refreshTokenRepo().insert({
    id: openOpsId(),
    created: now.toISOString(),
    updated: now.toISOString(),
    tokenHash: sha256Hex(token),
    grantId: params.grantId,
    familyId: params.familyId,
    clientId: params.clientId,
    resource: params.resource,
    scope: params.scope,
    projectId: params.projectId,
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
  });

  return token;
}

export type RedeemAuthorizationCodeParams = {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  resource: string;
};

export type RotateRefreshTokenParams = {
  refreshToken: string;
  clientId: string;
  /**
   * Switch the connection to another project the user belongs to. Omitted keeps it
   * where it is. Membership is re-checked either way, so this cannot reach a project
   * the user could not reach in the browser.
   */
  requestedProjectId?: string;
};

export const tokensService = {
  /**
   * Issues a single-use code for an approved authorization request. The code is
   * stored only as a hash, and every parameter the token endpoint must later
   * re-check is copied from the already-validated pending record.
   */
  async issueAuthorizationCode(
    pending: OAuthPendingAuthorization,
    userId: string,
  ): Promise<string> {
    const code = generateOpaqueToken();
    const now = new Date();

    await codeRepo().insert({
      id: openOpsId(),
      created: now.toISOString(),
      updated: now.toISOString(),
      codeHash: sha256Hex(code),
      clientId: pending.clientId,
      userId,
      redirectUri: pending.redirectUri,
      codeChallenge: pending.codeChallenge,
      resource: pending.resource,
      scope: pending.scope,
      expiresAt: new Date(
        now.getTime() + AUTHORIZATION_CODE_TTL_MS,
      ).toISOString(),
      consumedAt: null,
    });

    return code;
  },

  async redeemAuthorizationCode(
    params: RedeemAuthorizationCodeParams,
  ): Promise<OAuthTokenResponse> {
    const codeHash = sha256Hex(params.code);

    // Claim the code before validating anything else: the conditional update is
    // what makes a replayed code fail even when two requests arrive together.
    const claim = await codeRepo().update(
      { codeHash, consumedAt: IsNull() },
      { consumedAt: new Date().toISOString() },
    );

    if (claim.affected !== 1) {
      throw invalidGrant(UNUSABLE_CODE);
    }

    const codeRecord = await codeRepo().findOneBy({ codeHash });

    if (!codeRecord || isExpired(codeRecord.expiresAt, Date.now())) {
      throw invalidGrant(UNUSABLE_CODE);
    }

    if (
      codeRecord.clientId !== params.clientId ||
      codeRecord.redirectUri !== params.redirectUri
    ) {
      throw invalidGrant(UNUSABLE_CODE);
    }

    const resource = resolveResource(params.resource);

    if (!resource || resource.canonicalUri !== codeRecord.resource) {
      throw invalidGrant(UNUSABLE_CODE);
    }

    if (!verifyPkce(params.codeVerifier, codeRecord.codeChallenge)) {
      throw invalidGrant(UNUSABLE_CODE);
    }

    const user = await loadActiveUserOrThrow(codeRecord.userId);
    // Where the connection starts. Recorded on the refresh token rather than the grant,
    // because it is a property of the credential chain and changes when the client
    // switches project.
    const projectId = await resolveDefaultProjectId(user);
    const grant = await grantsService.create({
      clientId: codeRecord.clientId,
      userId: codeRecord.userId,
      resourceId: resource.id,
    });

    const accessToken = await mintAccessToken({
      grant,
      audience: resource.audience,
      scope: codeRecord.scope,
      projectId,
      ttlSeconds: oauthConfig.getAccessTokenTtlSeconds(),
    });

    const refreshToken = await issueRefreshToken({
      grantId: grant.id,
      familyId: openOpsId(),
      clientId: grant.clientId,
      resource: resource.canonicalUri,
      scope: codeRecord.scope,
      projectId,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: oauthConfig.getAccessTokenTtlSeconds(),
      scope: codeRecord.scope,
      refresh_token: refreshToken,
    };
  },

  /**
   * Rotates a refresh token (OAuth 2.1 §4.3.1). Presenting a token that was
   * already rotated means either a replay or a stolen token racing the real
   * client, and cannot be distinguished from the server's side — so the whole
   * family is revoked and the connection has to be re-authorized.
   */
  async rotateRefreshToken(
    params: RotateRefreshTokenParams,
  ): Promise<OAuthTokenResponse> {
    const tokenHash = sha256Hex(params.refreshToken);
    const existingToken = await refreshTokenRepo().findOneBy({ tokenHash });

    if (!existingToken) {
      throw invalidGrant('invalid refresh token');
    }

    // Everything that can be judged without consuming the token is judged first.
    // Revoking on the way in would let one rejected request — a wrong client id,
    // a momentary outage — destroy a working credential, and the client's natural
    // retry would then look exactly like a replay.
    if (existingToken.clientId !== params.clientId) {
      throw invalidGrant('invalid refresh token');
    }

    if (isExpired(existingToken.expiresAt, Date.now())) {
      throw invalidGrant('refresh token expired');
    }

    const grant = await grantsService.getActiveGrantOrThrow(
      existingToken.grantId,
    );
    const user = await loadActiveUserOrThrow(grant.userId);
    // A refresh is where a connection changes project: the client names where it wants
    // to be, and membership decides whether it may. Defaulting to the presented token's
    // own project is what makes a plain renewal equivalent to the credential it
    // replaces — falling back to the grant would quietly undo an earlier switch.
    const projectId = await authorizeProjectOrThrow(
      user,
      params.requestedProjectId ?? existingToken.projectId,
      params.requestedProjectId !== undefined,
    );

    const resource = resolveResource(existingToken.resource);

    if (!resource) {
      throw invalidGrant(
        'the resource for this authorization no longer exists',
      );
    }

    // Only now consume it. The conditional update is what makes rotation atomic:
    // of two requests presenting the same token, exactly one proceeds.
    const claim = await refreshTokenRepo().update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date().toISOString() },
    );

    if (claim.affected !== 1) {
      // Already revoked. A deliberate revocation of the connection also revokes
      // its tokens, so check that first: reporting it as a replay would
      // misattribute the user's own action to an attack.
      const grantSnapshot = await grantsService.getGrantSnapshot(
        existingToken.grantId,
      );

      if (grantSnapshot?.status !== 'active') {
        throw invalidGrant(
          'the authorization for this client has been revoked',
        );
      }

      await tokensService.revokeFamily(existingToken.familyId);
      logger.warn('OAuth refresh token reuse detected; family revoked', {
        familyId: existingToken.familyId,
        grantId: existingToken.grantId,
        clientId: existingToken.clientId,
      });
      throw invalidGrant('refresh token reuse detected');
    }

    const accessToken = await mintAccessToken({
      grant,
      audience: resource.audience,
      scope: existingToken.scope,
      projectId,
      ttlSeconds: oauthConfig.getAccessTokenTtlSeconds(),
    });

    const refreshToken = await issueRefreshToken({
      grantId: grant.id,
      // Same family: rotation forms a chain, and reuse anywhere in it is fatal.
      familyId: existingToken.familyId,
      clientId: existingToken.clientId,
      resource: existingToken.resource,
      scope: existingToken.scope,
      projectId,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: oauthConfig.getAccessTokenTtlSeconds(),
      scope: existingToken.scope,
      refresh_token: refreshToken,
    };
  },

  async revokeFamily(familyId: string): Promise<void> {
    await refreshTokenRepo().update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date().toISOString() },
    );
  },

  /** RFC 7009: revoking any refresh token revokes the whole connection. */
  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    const record = await refreshTokenRepo().findOneBy({
      tokenHash: sha256Hex(refreshToken),
    });

    if (!record) {
      return;
    }

    await grantsService.revoke(record.grantId);
  },

  /**
   * The API-audience token handed to a resource server. `projectId` is explicit
   * so the caller states which project the token is for and the claim, not any
   * stored state, decides what it can act on.
   */
  async mintExchangedApiToken(params: {
    grant: Pick<OAuthGrant, 'id' | 'userId' | 'clientId'>;
    scope: string;
    projectId: string;
  }): Promise<{ accessToken: string; expiresIn: number }> {
    const expiresIn = oauthConfig.getExchangeTokenTtlSeconds();
    const accessToken = await mintAccessToken({
      grant: params.grant,
      audience: oauthConfig.getApiAudience(),
      scope: params.scope,
      projectId: params.projectId,
      ttlSeconds: expiresIn,
    });

    return { accessToken, expiresIn };
  },
};
