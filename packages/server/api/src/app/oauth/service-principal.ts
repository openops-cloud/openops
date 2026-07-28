import { isNil, Principal, PrincipalType, UserStatus } from '@openops/shared';
import { userService } from '../user/user-service';
import { grantsService } from './grants.service';
import { invalidGrant } from './oauth-errors';
import { OAuthAccessTokenClaims } from './oauth-model';
import { getOAuthProjectMembershipService } from './project-membership-factory';

/**
 * Turns a verified OAuth access token into a request principal.
 *
 * The token's audience is checked before this is reached, so it is known to be
 * addressed to the API. The project comes from the token's own `project_id`
 * claim, which means a token can only ever act on the project it was minted for.
 *
 * What is re-checked on every request is everything that can change after the
 * token was issued: the connection may have been revoked, the user deactivated,
 * or their access to that project withdrawn. Access tokens are self-contained,
 * so this is what makes those changes take effect without waiting for expiry.
 */
export async function buildOAuthServicePrincipal(
  claims: OAuthAccessTokenClaims,
): Promise<Principal> {
  if (!claims.grant_id) {
    throw invalidGrant('token is not bound to an authorization');
  }

  // Required: a token with no project names no authority, and falling back to
  // stored state would reintroduce a second source of truth.
  if (!claims.project_id) {
    throw invalidGrant('token is not bound to a project');
  }

  const grant = await grantsService.getActiveGrantOrThrow(claims.grant_id);

  if (grant.userId !== claims.sub) {
    throw invalidGrant('token does not match its authorization');
  }

  const user = await userService.get({ id: grant.userId });

  if (isNil(user) || user.status !== UserStatus.ACTIVE) {
    throw invalidGrant('the user for this authorization is no longer active');
  }

  const membership = await getOAuthProjectMembershipService().getForUser(
    user,
    claims.project_id,
  );

  if (isNil(membership)) {
    throw invalidGrant('the project for this authorization is not accessible');
  }

  // Recorded here as well as at token exchange, so a connection used directly
  // against the API still shows a last-used time. Throttled internally.
  await grantsService.touch(grant.id);

  return {
    id: user.id,
    externalId: user.externalId,
    type: PrincipalType.SERVICE,
    projectId: membership.projectId,
    projectRole: membership.projectRole,
    organization: {
      id: membership.organizationId,
      role: user.organizationRole,
    },
  };
}
