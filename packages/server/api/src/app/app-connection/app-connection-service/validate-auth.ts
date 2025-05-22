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
import {
  blockMetadataService,
  getBlockPackage,
} from '../../blocks/block-metadata-service';

export const engineValidateAuth = async (
  params: EngineValidateAuthParams,
): Promise<void> => {
  const environment = system.getOrThrow(SharedSystemProp.ENVIRONMENT);
  if (environment === EnvironmentType.TESTING) {
    return;
  }
  const { blockName, auth, projectId } = params;

  const blockMetadata = await blockMetadataService.getOrThrow({
    name: blockName,
    projectId,
    version: undefined,
  });

  const engineToken = await accessTokenManager.generateEngineToken({
    projectId,
  });
  const engineResponse = await engineRunner.executeValidateAuth(engineToken, {
    block: await getBlockPackage(projectId, {
      blockName,
      blockVersion: blockMetadata.version,
      blockType: blockMetadata.blockType,
      packageType: blockMetadata.packageType,
    }),
    auth,
    projectId,
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
  blockName: string;
  projectId: ProjectId;
  auth: AppConnectionValue;
};
