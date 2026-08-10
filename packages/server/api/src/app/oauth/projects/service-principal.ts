import { isNil, Principal, PrincipalType, UserStatus } from '@openops/shared';
import { userService } from '../../user/user-service';
import { grantsService } from '../clients/grants.service';
import { invalidGrant } from '../common/oauth-errors';
import { OAuthAccessTokenClaims } from '../storage/oauth-model';
import { getOAuthProjectMembershipService } from './project-membership-factory';

/**
 * Turns a verified OAuth access token into a request principal. Audience is already
 * checked by the caller, and the project comes from the token's own claim.
 *
 * Everything that can change after issuance — revocation, deactivation, withdrawn project
 * access — is re-checked here, since access tokens are self-contained.
 */
export async function buildOAuthServicePrincipal(
  claims: OAuthAccessTokenClaims,
): Promise<Principal> {
  if (!claims.grant_id) {
    throw invalidGrant('token is not bound to an authorization');
  }

  // Required: falling back to stored state would reintroduce a second source of truth.
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

  // Also at token exchange, so a connection used directly against the API still shows a
  // last-used time. Throttled internally.
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
