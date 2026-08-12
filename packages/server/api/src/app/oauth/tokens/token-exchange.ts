import { isNil, UserStatus } from '@openops/shared';
import { userService } from '../../user/user-service';
import {
  clientsService,
  TOKEN_EXCHANGE_GRANT,
} from '../clients/clients.service';
import { grantsService } from '../clients/grants.service';
import {
  invalidGrant,
  invalidRequest,
  invalidTarget,
} from '../common/oauth-errors';
import { oauthConfig } from '../config/oauth-config';
import { getOAuthProjectMembershipService } from '../projects/project-membership-factory';
import { signingKeyService } from './signing-key.service';
import { tokensService } from './tokens.service';

const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';
const EXCHANGED_SCOPE = 'api';

export type ExchangeTokenParams = {
  authorizationHeader: string | undefined;
  subjectToken: string;
  subjectTokenType?: string;
  /** Act in this project instead of the subject token's. Must be one the user has. */
  requestedProjectId?: string;
};

export type ExchangeTokenResponse = {
  access_token: string;
  issued_token_type: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
};

/**
 * RFC 8693 token exchange for the hosted MCP resource server. The client's token is bound
 * to the MCP audience and must never reach the API (the MCP authorization spec's
 * no-token-passthrough rule), so it is swapped here for a short-lived API-audience one.
 */
export async function exchangeToken(
  params: ExchangeTokenParams,
): Promise<ExchangeTokenResponse> {
  // First, so an unauthenticated caller cannot probe token or grant state.
  const client = await clientsService.authenticateResourceServerClient(
    params.authorizationHeader,
  );
  clientsService.assertGrantTypeAllowed(client, TOKEN_EXCHANGE_GRANT);

  if (
    !isNil(params.subjectTokenType) &&
    params.subjectTokenType !== ACCESS_TOKEN_TYPE
  ) {
    throw invalidRequest(`subject_token_type must be ${ACCESS_TOKEN_TYPE}`);
  }

  const mcpResourceUrl = oauthConfig.getMcpResourceUrl();

  if (isNil(mcpResourceUrl)) {
    throw invalidTarget('the mcp resource is not configured');
  }

  // Pinning the audience is what makes the separation real: an API-audience token
  // presented here fails verification.
  const claims = await signingKeyService.verifyAccessToken(
    params.subjectToken,
    mcpResourceUrl,
  );

  const grantId = claims['grant_id'];

  if (typeof grantId !== 'string') {
    throw invalidGrant('token is not bound to an authorization');
  }

  // Access tokens are self-contained, so this is the revocation check for every MCP
  // request that reaches the API.
  const grant = await grantsService.getActiveGrantOrThrow(grantId);
  const user = await userService.get({ id: grant.userId });

  if (isNil(user) || user.status !== UserStatus.ACTIVE) {
    throw invalidGrant('the user for this authorization is no longer active');
  }

  const subjectProjectId = claims['project_id'];

  if (typeof subjectProjectId !== 'string') {
    throw invalidGrant('token is not bound to a project');
  }

  // Defaults to the subject token's project; a resource server may name another, which is
  // how an agent switches project without re-authorizing. Bounded by the user's own
  // membership, re-read here, so a switch can never reach further than the browser could.
  const targetProjectId = params.requestedProjectId ?? subjectProjectId;

  const membership = await getOAuthProjectMembershipService().getForUser(
    user,
    targetProjectId,
  );

  if (isNil(membership)) {
    throw invalidTarget('the requested project is not accessible');
  }

  const { accessToken, expiresIn } = await tokensService.mintExchangedApiToken({
    grant: { id: grant.id, userId: grant.userId, clientId: grant.clientId },
    scope: EXCHANGED_SCOPE,
    projectId: membership.projectId,
  });

  await grantsService.touch(grant.id);

  return {
    access_token: accessToken,
    issued_token_type: ACCESS_TOKEN_TYPE,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: EXCHANGED_SCOPE,
  };
}
