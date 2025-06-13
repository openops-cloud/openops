import { logger, SharedSystemProp, system } from '@openops/server-shared';
import {
  AppConnectionValue,
  ApplicationError,
  EngineResponseStatus,
  EnvironmentType,
  ErrorCode,
  ProjectId,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../../authentication/lib/access-token-manager';
import { getAuthProviderMetadata } from '../connection-providers-resolver';

export const engineValidateAuth = async (
  params: EngineValidateAuthParams,
): Promise<void> => {
  const environment = system.getOrThrow(SharedSystemProp.ENVIRONMENT);
  if (environment === EnvironmentType.TESTING) {
    return;
  }
  const { authProviderKey, auth, projectId } = params;

  const engineToken = await accessTokenManager.generateEngineToken({
    projectId,
  });

  const authProperty = await getAuthProviderMetadata(
    authProviderKey,
    projectId,
  );
  const engineResponse = await engineRunner.executeValidateAuth(engineToken, {
    auth,
    projectId,
    authProperty,
  });

  if (engineResponse.status !== EngineResponseStatus.OK) {
    logger.error(
      engineResponse,
      '[AppConnectionService#engineValidateAuth] engineResponse',
    );
    throw new ApplicationError({
      code: ErrorCode.ENGINE_OPERATION_FAILURE,
      params: {
        message: 'Failed to run engine validate auth',
        context: engineResponse,
      },
    });
  }

  const validateAuthResult = engineResponse.result;

  if (!validateAuthResult.valid) {
    throw new ApplicationError({
      code: ErrorCode.INVALID_APP_CONNECTION,
      params: {
        error: validateAuthResult.error,
      },
    });
  }
};

type EngineValidateAuthParams = {
  authProviderKey: string;
  projectId: ProjectId;
  auth: AppConnectionValue;
};
