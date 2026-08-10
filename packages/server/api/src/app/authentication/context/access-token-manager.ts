import { AppSystemProp, logger, system } from '@openops/server-shared';
import {
  ApplicationError,
  assertNotNullOrUndefined,
  EnginePrincipal,
  ErrorCode,
  isNil,
  openOpsId,
  Principal,
  PrincipalType,
  ProjectId,
  WorkerMachineType,
  WorkerPrincipal,
} from '@openops/shared';
import jwtLibrary from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { JwtSignAlgorithm, jwtUtils } from '../../helper/jwt-utils';
import { OAuthError } from '../../oauth/common/oauth-errors';
import { oauthConfig } from '../../oauth/config/oauth-config';
import { buildOAuthServicePrincipal } from '../../oauth/projects/service-principal';
import { OAuthAccessTokenClaims } from '../../oauth/storage/oauth-model';
import { signingKeyService } from '../../oauth/tokens/signing-key.service';

const openOpsRefreshTokenLifetimeSeconds =
  (system.getNumber(AppSystemProp.JWT_TOKEN_LIFETIME_HOURS) ?? 168) * 3600;
export const accessTokenManager = {
  async generateToken(
    principal: Principal,
    expiresInSeconds: number = openOpsRefreshTokenLifetimeSeconds,
  ): Promise<string> {
    const secret = await jwtUtils.getJwtSecret();

    return jwtUtils.sign({
      payload: principal,
      key: secret,
      expiresInSeconds,
    });
  },

  async generateEngineToken({
    executionCorrelationId,
    projectId,
    queueToken,
  }: GenerateEngineTokenParams): Promise<string> {
    const enginePrincipal: EnginePrincipal = {
      id: executionCorrelationId ?? nanoid(),
      type: PrincipalType.ENGINE,
      projectId,
      queueToken,
    };

    const secret = await jwtUtils.getJwtSecret();

    return jwtUtils.sign({
      payload: enginePrincipal,
      key: secret,
      expiresInSeconds: 60 * 60 * 24 * 2,
    });
  },

  async generateWorkerToken({
    type,
    organizationId,
  }: {
    organizationId: string | null;
    type: WorkerMachineType;
  }): Promise<string> {
    const workerPrincipal: WorkerPrincipal = {
      id: openOpsId(),
      type: PrincipalType.WORKER,
      organization: isNil(organizationId)
        ? null
        : {
            id: organizationId,
          },
      worker: {
        type,
      },
    };

    const secret = await jwtUtils.getJwtSecret();

    return jwtUtils.sign({
      payload: workerPrincipal,
      key: secret,
      expiresInSeconds: 60 * 60 * 24 * 365 * 100,
    });
  },

  async generateServiceToken(
    userToken: string,
    expiresInSeconds: number = openOpsRefreshTokenLifetimeSeconds,
  ): Promise<string> {
    const principal = await this.extractPrincipal(userToken);
    if (principal.type !== PrincipalType.USER) {
      throw new ApplicationError({
        code: ErrorCode.INVALID_BEARER_TOKEN,
        params: {
          message: 'Service token can only be generated from a user token',
        },
      });
    }

    const secret = await jwtUtils.getJwtSecret();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { exp: _exp, iat: _iat, iss: _iss, ...payload } = principal as any;

    return jwtUtils.sign({
      payload: {
        ...payload,
        type: PrincipalType.SERVICE,
      },
      key: secret,
      expiresInSeconds,
    });
  },

  async extractPrincipal(token: string): Promise<Principal> {
    if (isOAuthIssuedToken(token)) {
      return extractOAuthPrincipal(token);
    }

    const secret = await jwtUtils.getJwtSecret();

    try {
      const decoded = await jwtUtils.decodeAndVerify<Principal>({
        jwt: token,
        key: secret,
      });
      assertNotNullOrUndefined(decoded.type, 'decoded.type');
      return decoded;
    } catch (error) {
      logger.debug('Failed to decode token', error);

      throw new ApplicationError({
        code: ErrorCode.INVALID_BEARER_TOKEN,
        params: {
          message: 'invalid access token',
        },
      });
    }
  },
};

// Internal tokens are always HS256 and OAuth-issued ones the only RS256, so dispatching on
// the algorithm keeps the two trust domains separate.
function isOAuthIssuedToken(token: string): boolean {
  return (
    jwtLibrary.decode(token, { complete: true })?.header?.alg ===
    JwtSignAlgorithm.RS256
  );
}

/**
 * Verified here rather than per route so no caller can skip the audience check: a token
 * minted for the MCP resource server is rejected everywhere, including paths that call
 * `extractPrincipal` directly, such as websockets.
 */
async function extractOAuthPrincipal(token: string): Promise<Principal> {
  const invalidToken = new ApplicationError({
    code: ErrorCode.INVALID_BEARER_TOKEN,
    params: {
      message: 'invalid access token',
    },
  });

  if (!oauthConfig.isEnabled()) {
    throw invalidToken;
  }

  try {
    const claims = await signingKeyService.verifyAccessToken(
      token,
      oauthConfig.getApiAudience(),
    );

    return await buildOAuthServicePrincipal(
      claims as unknown as OAuthAccessTokenClaims,
    );
  } catch (error) {
    // Only a verdict about the token itself becomes a 401. Reporting a server-side
    // failure as an invalid credential would have clients discard their refresh token and
    // re-authorize, turning a brief outage into a re-consent storm.
    if (error instanceof OAuthError && error.statusCode < 500) {
      logger.info('Rejected OAuth access token', {
        error: error.errorCode,
        description: error.description,
      });
      throw invalidToken;
    }

    logger.error('OAuth authentication failed for a non-token reason', error);
    throw error;
  }
}

type GenerateEngineTokenParams = {
  projectId: ProjectId;
  queueToken?: string;
  executionCorrelationId?: string;
};
