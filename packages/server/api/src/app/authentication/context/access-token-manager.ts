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
