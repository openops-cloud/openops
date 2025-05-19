jest.mock('@openops/server-shared', () => {
  const actual = jest.requireActual('@openops/server-shared');
  return {
    ...actual,
    system: {
      ...actual.system,
      getOrThrow: jest.fn().mockReturnValue('test-data'),
      get: jest.fn().mockReturnValue('test-data'),
    },
  };
});

jest.mock('../../../src/app/helper/encryption', () => ({
  encryptUtils: {
    encryptObject: jest.fn((val) => `encrypted-${JSON.stringify(val)}`),
    decryptObject: jest.fn((val) => JSON.parse(val.replace('encrypted-', ''))),
  },
}));

const getOrThrowMock = jest.fn((input) => Promise.resolve(input));

jest.mock('../../../src/app/blocks/block-metadata-service', () => ({
  blockMetadataService: {
    ...jest.requireActual('../../../src/app/blocks/block-metadata-service'),
    getOrThrow: getOrThrowMock,
  },
}));

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

import {
  AppConnectionStatus,
  AppConnectionType,
  ApplicationError,
  ErrorCode,
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
    value: 'encrypted-{"type":"SECRET_TEXT","secret":"old"}',
    status: AppConnectionStatus.ACTIVE,
  };
  const blockMetadata = {
    auth: { secret: { type: 'string', label: 'Secret' } },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    findOneByMock.mockResolvedValue(existingConnection);
    getOrThrowMock.mockResolvedValue(blockMetadata);
    updateMock.mockResolvedValue(undefined);
  });

  test('should update connection with merged value and return decrypted result', async () => {
    const result = await appConnectionService.patch({
      projectId,
      request,
      userId,
    });

    expect(findOneByMock).toHaveBeenCalledWith({
      name: connectionName,
      projectId,
    });

    expect(getOrThrowMock).toHaveBeenCalledWith({
      name: blockName,
      projectId,
      version: undefined,
    });

    expect(restoreRedactedSecrets).toHaveBeenCalledWith(
      request.value,
      { type: 'SECRET_TEXT', secret: 'old' },
      blockMetadata.auth,
    );

    expect(encryptUtils.encryptObject).toHaveBeenCalledWith({
      ...request.value,
      type: 'SECRET_TEXT',
      secret: 'abc',
    });

    expect(updateMock).toHaveBeenCalledWith(existingConnection.id, {
      ...request,
      id: existingConnection.id,
      projectId,
      status: AppConnectionStatus.ACTIVE,
      value: 'encrypted-{"type":"SECRET_TEXT","secret":"abc"}',
    });

    expect(result).toEqual({
      ...request,
      id: existingConnection.id,
      projectId,
      status: AppConnectionStatus.ACTIVE,
      value: { type: 'SECRET_TEXT', secret: 'abc' },
    });
  });

  test('should throw if the connection was not found', async () => {
    expect(() =>
      appConnectionService.patch({ projectId, request, userId }),
    ).toThrow(
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
