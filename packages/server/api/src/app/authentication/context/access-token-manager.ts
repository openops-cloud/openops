import { AppSystemProp, logger, system } from '@openops/server-shared';
import {
  ApplicationError,
  assertNotNullOrUndefined,
  EnginePrincipal,
  ErrorCode,
  GeneratedRefreshToken,
  isNil,
  openOpsId,
  Principal,
  PrincipalType,
  ProjectId,
  WorkerMachineType,
  WorkerPrincipal,
} from '@openops/shared';
import { nanoid } from 'nanoid';
import { jwtUtils } from '../../helper/jwt-utils';

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

  async generateTokenGeneratorToken(
    userToken: string,
    hasExpiration = true,
  ): Promise<GeneratedRefreshToken> {
    const principal: Principal = await this.extractPrincipal(userToken);
    if (principal.type !== PrincipalType.USER) {
      throw new ApplicationError({
        code: ErrorCode.INVALID_BEARER_TOKEN,
        params: {
          message:
            'Token generator token can only be generated from a user token',
        },
      });
    }

    const secret = await jwtUtils.getJwtSecret();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { exp: _exp, iat: _iat, iss: _iss, ...payload } = principal as any;

    const expiresInSeconds = hasExpiration ? 60 * 60 * 24 * 30 * 3 : undefined;

    const token = await jwtUtils.sign({
      payload: {
        ...payload,
        userId: principal.id,
        projectId: principal.projectId,
        type: PrincipalType.TOKEN_GENERATOR,
      },
      key: secret,
      expiresInSeconds, // 3 months
    });

    return {
      token,
      expirationTime: expiresInSeconds
        ? String(expiresInSeconds * 1000)
        : undefined,
    };
  },

  async extractPrincipal(token: string): Promise<Principal> {
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

type GenerateEngineTokenParams = {
  projectId: ProjectId;
  queueToken?: string;
  executionCorrelationId?: string;
};
