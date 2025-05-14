import {
  AppConnectionStatus,
  AppConnectionType,
  UpsertAppConnectionRequestBody,
} from '@openops/shared';
import { appConnectionService } from '../../../src/app/app-connection/app-connection-service/app-connection-service';
import { restoreRedactedSecrets } from '../../../src/app/app-connection/app-connection-utils';
import { blockMetadataService } from '../../../src/app/blocks/block-metadata-service';
import { repoFactory } from '../../../src/app/core/db/repo-factory';
import { encryptUtils } from '../../../src/app/helper/encryption';

jest.mock('../../../src/app/helper/encryption', () => ({
  encryptUtils: {
    encryptObject: jest.fn((val) => `encrypted-${JSON.stringify(val)}`),
    decryptObject: jest.fn((val) => JSON.parse(val.replace('encrypted-', ''))),
  },
}));

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  repoFactory: () => () => ({
    findOneByOrFail: jest.fn(),
    update: jest.fn(),
  }),
}));

const getMock = jest.fn();
jest.mock('../../../src/app/blocks/block-metadata-service', () => ({
  blockMetadataService: {
    get: getMock,
  },
}));

jest.mock('../../../src/app/app-connection/app-connection-utils', () => ({
  restoreRedactedSecrets: jest.fn((val) => val),
}));

const updateMock = jest.fn();
const findOneByOrFailMock = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    update: updateMock,
    findOneByOrFail: findOneByOrFailMock,
  }),
}));

describe('appConnectionService.update', () => {
  const projectId = 'project-123';
  const userId = 'user-123';
  const connectionName = 'test-conn';
  const blockName = 'test-block';

  const request: UpsertAppConnectionRequestBody = {
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

    findOneByOrFailMock.mockResolvedValue(existingConnection);
    getMock.mockResolvedValue(blockMetadata);
    updateMock.mockResolvedValue(undefined);
  });

  test('should update connection with merged value and return decrypted result', async () => {
    const result = await appConnectionService.update({
      projectId,
      request,
      userId,
    });

    expect(findOneByOrFailMock).toHaveBeenCalledWith({
      name: connectionName,
      projectId,
    });

    expect(blockMetadataService.get).toHaveBeenCalledWith({
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

  test('should throw if block metadata not found', async () => {
    getMock.mockResolvedValue(null);

    await expect(
      appConnectionService.update({ projectId, request, userId }),
    ).rejects.toThrow('Block metadata not found for test-block');
  });
});
