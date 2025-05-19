jest.mock('../../../src/app/helper/encryption', () => ({
  encryptUtils: {
    encryptObject: jest.fn((val) => `encrypted-${JSON.stringify(val)}`),
    decryptObject: jest.fn((val) => JSON.parse(val.replace('encrypted-', ''))),
  },
}));

jest.mock(
  '../../../src/app/app-connection/app-connection-service/validate-auth',
  () => ({
    engineValidateAuth: jest.fn(),
  }),
);

jest.mock('../../../src/app/app-connection/app-connection-utils', () => ({
  restoreRedactedSecrets: jest.fn((val) => val),
}));

const updateMock = jest.fn();
const findOneByMock = jest.fn();
jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    update: updateMock,
    findOneBy: findOneByMock,
  }),
}));

import { BlockMetadataModel } from '@openops/blocks-framework';
import {
  AppConnectionStatus,
  AppConnectionType,
  ApplicationError,
  BlockType,
  ErrorCode,
  PackageType,
  PatchAppConnectionRequestBody,
} from '@openops/shared';
import { appConnectionService } from '../../../src/app/app-connection/app-connection-service/app-connection-service';
import { restoreRedactedSecrets } from '../../../src/app/app-connection/app-connection-utils';
import { encryptUtils } from '../../../src/app/helper/encryption';

describe('appConnectionService.update', () => {
  const projectId = 'project-123';
  const userId = 'user-123';
  const connectionName = 'test-conn';
  const blockName = 'test-block';

  const request: PatchAppConnectionRequestBody = {
    id: 'conn-id-123',
    type: AppConnectionType.SECRET_TEXT,
    projectId,
    name: connectionName,
    blockName,
    value: {
      type: AppConnectionType.SECRET_TEXT,
      secret_text: 'abc',
    },
  };

  const existingConnection = {
    id: 'conn-id-123',
    name: connectionName,
    projectId,
    blockName,
    value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"old"}',
    status: AppConnectionStatus.ACTIVE,
  };
  const blockMetadata = {
    name: 'test-block',
    displayName: 'Test Block',
    description: 'desc',
    logoUrl: 'url',
    version: '1.0.0',
    authors: ['leyla'],
    actions: {},
    triggers: {},
    projectUsage: 0,
    blockType: BlockType.CUSTOM,
    packageType: PackageType.ARCHIVE,
  } as BlockMetadataModel;

  beforeEach(() => {
    jest.clearAllMocks();

    findOneByMock.mockResolvedValue(existingConnection);
    updateMock.mockResolvedValue(undefined);
  });

  test('should update connection with merged value and return decrypted result', async () => {
    const result = await appConnectionService.patch({
      projectId,
      request,
      userId,
      block: blockMetadata,
    });

    expect(findOneByMock).toHaveBeenCalledWith({
      id: request.id,
      projectId,
    });

    expect(restoreRedactedSecrets).toHaveBeenCalledWith(
      request.value,
      { type: 'SECRET_TEXT', secret_text: 'old' },
      blockMetadata.auth,
    );

    expect(encryptUtils.encryptObject).toHaveBeenCalledWith({
      ...request.value,
      type: 'SECRET_TEXT',
      secret_text: 'abc',
    });

    expect(updateMock).toHaveBeenCalledWith(existingConnection.id, {
      ...request,
      id: existingConnection.id,
      projectId,
      status: AppConnectionStatus.ACTIVE,
      value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"abc"}',
    });

    expect(result).toEqual({
      ...request,
      id: existingConnection.id,
      projectId,
      status: AppConnectionStatus.ACTIVE,
      value: { type: 'SECRET_TEXT', secret_text: 'abc' },
    });
  });

  test('should throw if the connection was not found', async () => {
    findOneByMock.mockResolvedValue(null);

    await expect(
      appConnectionService.patch({
        projectId,
        request,
        userId,
        block: blockMetadata,
      }),
    ).rejects.toThrow(
      new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityType: 'AppConnection',
          entityId: request.id,
        },
      }),
    );
  });
});
