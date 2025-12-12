import { logger, SharedSystemProp, system } from '@openops/server-shared';
import {
  AppConnectionValue,
  ApplicationError,
  EngineResponseStatus,
  ErrorCode,
  ProjectId,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../../authentication/context/access-token-manager';
import { findBlockByAuthProviderKey } from '../connection-providers-resolver';

export const engineValidateAuth = async (
  params: EngineValidateAuthParams,
): Promise<void> => {
  const shouldValidateAuth =
    system.getBoolean(SharedSystemProp.REQUIRE_ENGINE_VALIDATE_AUTH) ?? true;
  if (!shouldValidateAuth) {
    return;
  }
  const { authProviderKey, auth, projectId } = params;

  const engineToken = await accessTokenManager.generateEngineToken({
    projectId,
  });

  const blockToValidate = await findBlockByAuthProviderKey(
    authProviderKey,
    projectId,
  );

  const blockName = blockToValidate.name;
  const blockVersion = blockToValidate.version;
  const engineResponse = await engineRunner.executeValidateAuth(engineToken, {
    auth,
    projectId,
    blockName,
    blockVersion,
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
