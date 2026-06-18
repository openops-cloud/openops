jest.mock('../../../src/app/flags/flag.service', () => ({
  flagService: {
    getCurrentRelease: jest.fn(),
  },
}));

const mockDistributedLock = {
  acquireLock: jest.fn().mockResolvedValue({ release: jest.fn() }),
};

const mockExceptionHandler = {
  handle: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  encryptUtils: {
    encryptObject: jest.fn((val) => `encrypted-${JSON.stringify(val)}`),
    decryptObject: jest.fn((val) => JSON.parse(val.replace('encrypted-', ''))),
  },
  distributedLock: mockDistributedLock,
  exceptionHandler: mockExceptionHandler,
  logger: mockLogger,
}));

jest.mock(
  '../../../src/app/app-connection/app-connection-service/validate-auth',
  () => ({
    engineValidateAuth: jest.fn(),
  }),
);

const mockOAuth2Util = {
  removeRefreshTokenAndClientSecret: jest.fn((conn) => conn),
  isExpired: jest.fn().mockReturnValue(false),
  isUserError: jest.fn().mockReturnValue(false),
  getOAuth2TokenUrl: jest.fn().mockResolvedValue('https://token.url'),
  shouldSkipValidation: jest.fn().mockReturnValue(false),
};

jest.mock(
  '../../../src/app/app-connection/app-connection-service/oauth2/oauth2-util',
  () => ({
    oauth2Util: mockOAuth2Util,
  }),
);

jest.mock(
  '../../../src/app/app-connection/app-connection-service/oauth2',
  () => ({
    oauth2Handler: {},
  }),
);

jest.mock('../../../src/app/app-connection/app-connection-utils', () => ({
  restoreRedactedSecrets: jest.fn((val) => val),
  removeSensitiveData: jest.fn((conn) => {
    const { value: _, ...rest } = conn;
    return rest;
  }),
}));

const mockSendConnectionCreatedEvent = jest.fn();
const mockSendConnectionUpdatedEvent = jest.fn();
jest.mock('../../../src/app/telemetry/event-models', () => ({
  sendConnectionCreatedEvent: mockSendConnectionCreatedEvent,
  sendConnectionUpdatedEvent: mockSendConnectionUpdatedEvent,
}));

const updateMock = jest.fn();
const findOneByMock = jest.fn();
const findOneByOrFailMock = jest.fn();
const upsertMock = jest.fn();
const deleteMock = jest.fn();
const whereMock = jest.fn().mockReturnThis();
const andWhereMock = jest.fn().mockReturnThis();
const paginateMock = jest.fn().mockResolvedValue({ data: [], cursor: null });

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    update: updateMock,
    findOneBy: findOneByMock,
    findOneByOrFail: findOneByOrFailMock,
    upsert: upsertMock,
    delete: deleteMock,
    createQueryBuilder: () => ({
      where: whereMock,
      andWhere: andWhereMock,
    }),
  }),
}));

jest.mock('../../../src/app/helper/pagination/build-paginator', () => ({
  buildPaginator: jest.fn(() => ({ paginate: paginateMock })),
}));

jest.mock('../../../src/app/helper/pagination/pagination-utils', () => ({
  ...jest.requireActual('../../../src/app/helper/pagination/pagination-utils'),
  paginationHelper: {
    decodeCursor: jest.fn(() => ({ nextCursor: null, previousCursor: null })),
    createPage: jest.fn((data, cursor) => ({ data, cursor })),
  },
}));

import { BlockMetadataModel } from '@openops/blocks-framework';
import { encryptUtils } from '@openops/server-shared';
import {
  AppConnectionSortBy,
  AppConnectionStatus,
  AppConnectionType,
  ApplicationError,
  BlockType,
  ErrorCode,
  OAuth2GrantType,
  PackageType,
  PatchAppConnectionRequestBody,
  SortDirection,
  UpsertAppConnectionRequestBody,
} from '@openops/shared';
import { ILike, In } from 'typeorm';
import { appConnectionService } from '../../../src/app/app-connection/app-connection-service/app-connection-service';
import {
  removeSensitiveData,
  restoreRedactedSecrets,
} from '../../../src/app/app-connection/app-connection-utils';
import {
  AppConnectionEntity,
  AppConnectionSchema,
} from '../../../src/app/app-connection/app-connection.entity';
import { buildPaginator } from '../../../src/app/helper/pagination/build-paginator';

describe('appConnectionService', () => {
  const projectId = 'project-123';
  const userId = 'user-123';
  const connectionName = 'test-conn';
  const authProviderKey = 'test-provider';

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
    findOneByMock.mockResolvedValue(null);
    updateMock.mockResolvedValue(undefined);
    upsertMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);
    mockOAuth2Util.isExpired.mockReturnValue(false);
    mockOAuth2Util.removeRefreshTokenAndClientSecret.mockImplementation(
      (conn) => conn,
    );
  });

  describe('upsert', () => {
    const request: UpsertAppConnectionRequestBody = {
      name: connectionName,
      authProviderKey,
      type: AppConnectionType.SECRET_TEXT,
      value: {
        type: AppConnectionType.SECRET_TEXT,
        secret_text: 'my-secret',
      },
    };

    const encryptedConnection = {
      id: 'new-id',
      name: connectionName,
      projectId,
      authProviderKey,
      value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"my-secret"}',
      status: AppConnectionStatus.ACTIVE,
    };

    beforeEach(() => {
      findOneByOrFailMock.mockResolvedValue(encryptedConnection);
    });

    it('should create a new connection when none exists', async () => {
      findOneByMock.mockResolvedValue(null);

      const result = await appConnectionService.upsert({
        projectId,
        request,
        userId,
      });

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: connectionName,
          projectId,
          status: AppConnectionStatus.ACTIVE,
        }),
        ['name', 'projectId'],
      );
      expect(result.value).toEqual({
        type: 'SECRET_TEXT',
        secret_text: 'my-secret',
      });
    });

    it('should reuse existing connection ID when updating', async () => {
      findOneByMock.mockResolvedValue({ id: 'existing-id' });

      await appConnectionService.upsert({ projectId, request, userId });

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'existing-id' }),
        ['name', 'projectId'],
      );
    });

    it('should send created event for new connections', async () => {
      findOneByMock.mockResolvedValue(null);

      await appConnectionService.upsert({ projectId, request, userId });

      expect(mockSendConnectionCreatedEvent).toHaveBeenCalledWith(
        userId,
        projectId,
        authProviderKey,
      );
      expect(mockSendConnectionUpdatedEvent).not.toHaveBeenCalled();
    });

    it('should send updated event for existing connections', async () => {
      findOneByMock.mockResolvedValue({ id: 'existing-id' });

      await appConnectionService.upsert({ projectId, request, userId });

      expect(mockSendConnectionUpdatedEvent).toHaveBeenCalledWith(
        userId,
        projectId,
        authProviderKey,
      );
      expect(mockSendConnectionCreatedEvent).not.toHaveBeenCalled();
    });

    it('should throw for invalid connection name', async () => {
      const invalidRequest = { ...request, name: 'invalid name!' };

      await expect(
        appConnectionService.upsert({
          projectId,
          request: invalidRequest as UpsertAppConnectionRequestBody,
          userId,
        }),
      ).rejects.toThrow();
    });
  });

  describe('patch', () => {
    const request: PatchAppConnectionRequestBody = {
      id: 'conn-id-123',
      type: AppConnectionType.SECRET_TEXT,
      projectId,
      name: connectionName,
      authProviderKey,
      value: {
        type: AppConnectionType.SECRET_TEXT,
        secret_text: 'abc',
      },
    };

    const existingConnection = {
      id: 'conn-id-123',
      name: connectionName,
      projectId,
      authProviderKey,
      value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"old"}',
      status: AppConnectionStatus.ACTIVE,
    };

    beforeEach(() => {
      findOneByMock.mockResolvedValue(existingConnection);
    });

    it('should update connection and return decrypted result', async () => {
      const result = await appConnectionService.patch({
        projectId,
        request,
        userId,
        authProperty: blockMetadata.auth,
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

    it('should send updated telemetry event', async () => {
      await appConnectionService.patch({
        projectId,
        request,
        userId,
        authProperty: blockMetadata.auth,
      });

      expect(mockSendConnectionUpdatedEvent).toHaveBeenCalledWith(
        userId,
        projectId,
        authProviderKey,
      );
    });

    it('should throw for invalid connection name', async () => {
      const invalidRequest: PatchAppConnectionRequestBody = {
        ...request,
        name: 'test-conn$%&',
      };

      await expect(
        appConnectionService.patch({
          projectId,
          request: invalidRequest,
          userId,
          authProperty: blockMetadata.auth,
        }),
      ).rejects.toThrow();
    });

    it('should throw ENTITY_NOT_FOUND if connection does not exist', async () => {
      findOneByMock.mockResolvedValue(null);

      await expect(
        appConnectionService.patch({
          projectId,
          request,
          userId,
          authProperty: blockMetadata.auth,
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

  describe('getOne', () => {
    const encryptedConnection = {
      id: 'conn-1',
      name: connectionName,
      projectId,
      authProviderKey,
      value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"s"}',
      status: AppConnectionStatus.ACTIVE,
    };

    it('should return null when connection does not exist', async () => {
      findOneByMock.mockResolvedValue(null);

      const result = await appConnectionService.getOne({
        projectId,
        name: connectionName,
      });

      expect(result).toBeNull();
    });

    it('should return decrypted connection when no refresh needed', async () => {
      findOneByMock.mockResolvedValue(encryptedConnection);

      const result = await appConnectionService.getOne({
        projectId,
        name: connectionName,
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'conn-1',
          name: connectionName,
          value: { type: 'SECRET_TEXT', secret_text: 's' },
        }),
      );
      expect(
        mockOAuth2Util.removeRefreshTokenAndClientSecret,
      ).toHaveBeenCalled();
    });

    it('should refresh expired OAuth2 connections', async () => {
      const oauth2Connection = {
        ...encryptedConnection,
        value:
          'encrypted-{"type":"OAUTH2","access_token":"old","refresh_token":"rt","expires_in":0}',
      };

      findOneByMock.mockResolvedValue(oauth2Connection);
      mockOAuth2Util.isExpired.mockReturnValue(true);

      // lockAndRefreshConnection will call findOneBy again internally
      findOneByMock
        .mockResolvedValueOnce(oauth2Connection)
        .mockResolvedValueOnce(oauth2Connection);

      await appConnectionService.getOne({ projectId, name: connectionName });

      expect(mockDistributedLock.acquireLock).toHaveBeenCalledWith({
        key: `${projectId}_${connectionName}`,
        timeout: 20000,
      });
    });
  });

  describe('getOneOrThrow', () => {
    it('should throw ENTITY_NOT_FOUND when connection does not exist', async () => {
      findOneByMock.mockResolvedValue(null);

      await expect(
        appConnectionService.getOneOrThrow({ projectId, id: 'missing-id' }),
      ).rejects.toThrow(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            entityType: 'AppConnection',
            entityId: 'missing-id',
          },
        }),
      );
    });

    it('should return connection when found', async () => {
      const encryptedConnection = {
        id: 'conn-1',
        name: connectionName,
        projectId,
        authProviderKey,
        value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"s"}',
        status: AppConnectionStatus.ACTIVE,
      };

      findOneByMock.mockResolvedValue(encryptedConnection);

      const result = await appConnectionService.getOneOrThrow({
        projectId,
        id: 'conn-1',
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'conn-1',
          name: connectionName,
        }),
      );
    });
  });

  describe('delete', () => {
    it('should call repo delete with the correct params', async () => {
      await appConnectionService.delete({ projectId, id: 'conn-1' });

      expect(deleteMock).toHaveBeenCalledWith({ projectId, id: 'conn-1' });
    });
  });

  describe('getMetadataOrThrow', () => {
    it('should return id, projectId, and authProviderKey when connection exists', async () => {
      findOneByMock.mockResolvedValue({
        id: 'conn-1',
        projectId,
        authProviderKey,
        value: 'encrypted-secret',
      });

      const result = await appConnectionService.getMetadataOrThrow({
        projectId,
        id: 'conn-1',
      });

      expect(findOneByMock).toHaveBeenCalledWith({
        id: 'conn-1',
        projectId,
      });
      expect(result).toEqual({
        id: 'conn-1',
        projectId,
        authProviderKey,
      });
    });

    it('should throw ENTITY_NOT_FOUND when connection does not exist', async () => {
      findOneByMock.mockResolvedValue(null);

      await expect(
        appConnectionService.getMetadataOrThrow({
          projectId,
          id: 'non-existent',
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          error: expect.objectContaining({
            code: ErrorCode.ENTITY_NOT_FOUND,
          }),
        }),
      );
    });

    it('should succeed even when the connection value cannot be decrypted', async () => {
      const originalImpl = (
        encryptUtils.decryptObject as jest.Mock
      ).getMockImplementation();
      (encryptUtils.decryptObject as jest.Mock).mockImplementation(() => {
        throw new Error('decryption failed');
      });

      findOneByMock.mockResolvedValue({
        id: 'conn-corrupt',
        projectId,
        authProviderKey,
        value: 'corrupted-data',
      });

      const result = await appConnectionService.getMetadataOrThrow({
        projectId,
        id: 'conn-corrupt',
      });

      expect(result).toEqual({
        id: 'conn-corrupt',
        projectId,
        authProviderKey,
      });

      (encryptUtils.decryptObject as jest.Mock).mockImplementation(
        originalImpl,
      );
    });
  });

  describe('list', () => {
    beforeEach(() => {
      whereMock.mockClear();
      andWhereMock.mockClear();
      paginateMock.mockClear();
    });

    it('should use default sort (updated, DESC) when not specified', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: undefined,
        limit: 10,
        authProviders: undefined,
      });

      expect(buildPaginator).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ order: 'DESC' }),
          customPaginationColumn: expect.objectContaining({
            columnPath: 'updated',
            columnName: 'app_connection.updated',
          }),
        }),
      );
    });

    it('should apply requested sorting', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: undefined,
        limit: 10,
        authProviders: undefined,
        sortBy: AppConnectionSortBy.NAME,
        sortDirection: SortDirection.ASC,
      });

      expect(buildPaginator).toHaveBeenCalledWith({
        entity: AppConnectionEntity,
        query: {
          limit: 10,
          order: 'ASC',
          afterCursor: null,
          beforeCursor: null,
        },
        customPaginationColumn: {
          columnPath: 'name',
          columnName: 'app_connection.name',
          columnType: 'string',
        },
      });
    });

    it('should filter by authProviders case-insensitively', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: undefined,
        limit: 10,
        connectionsIds: undefined,
        authProviders: ['GiThUb', 'SlAcK'],
      });

      expect(andWhereMock).toHaveBeenCalledWith(
        'LOWER(app_connection.authProviderKey) IN (:...authProviders)',
        { authProviders: ['github', 'slack'] },
      );
    });

    it('should not add authProviders filter when array is empty', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: undefined,
        limit: 10,
        authProviders: [],
      });

      expect(andWhereMock).not.toHaveBeenCalled();
    });

    it('should not add authProviders filter when undefined', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: undefined,
        limit: 10,
        authProviders: undefined,
      });

      expect(andWhereMock).not.toHaveBeenCalled();
    });

    it('should build where clause with name filter using ILike', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: 'search',
        status: undefined,
        limit: 10,
        authProviders: undefined,
      });

      expect(whereMock).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          name: ILike('%search%'),
        }),
      );
    });

    it('should build where clause with status filter using In', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: [AppConnectionStatus.ACTIVE, AppConnectionStatus.ERROR],
        limit: 10,
        authProviders: undefined,
      });

      expect(whereMock).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          status: In([AppConnectionStatus.ACTIVE, AppConnectionStatus.ERROR]),
        }),
      );
    });

    it('should build where clause with connectionsIds filter using In', async () => {
      await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: undefined,
        limit: 10,
        connectionsIds: ['id-1', 'id-2'],
        authProviders: undefined,
      });

      expect(whereMock).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          id: In(['id-1', 'id-2']),
        }),
      );
    });

    it('should decrypt connections before returning', async () => {
      const encryptedConnections = [
        {
          id: 'c1',
          name: 'conn-1',
          projectId,
          value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"s1"}',
          status: AppConnectionStatus.ACTIVE,
        },
        {
          id: 'c2',
          name: 'conn-2',
          projectId,
          value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"s2"}',
          status: AppConnectionStatus.ACTIVE,
        },
      ];

      paginateMock.mockResolvedValue({
        data: encryptedConnections,
        cursor: null,
      });

      const result = await appConnectionService.list({
        projectId,
        cursorRequest: null,
        name: undefined,
        status: undefined,
        limit: 10,
        authProviders: undefined,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].value).toEqual({
        type: 'SECRET_TEXT',
        secret_text: 's1',
      });
      expect(result.data[1].value).toEqual({
        type: 'SECRET_TEXT',
        secret_text: 's2',
      });
    });
  });

  describe('listActiveConnectionsByIds', () => {
    it('should filter by ACTIVE status and remove sensitive data', async () => {
      const encryptedConnections = [
        {
          id: 'c1',
          name: 'conn-1',
          projectId,
          authProviderKey,
          value: 'encrypted-{"type":"SECRET_TEXT","secret_text":"s"}',
          status: AppConnectionStatus.ACTIVE,
        },
      ];

      paginateMock.mockResolvedValue({
        data: encryptedConnections,
        cursor: null,
      });

      const result = await appConnectionService.listActiveConnectionsByIds(
        projectId,
        ['c1'],
      );

      expect(removeSensitiveData).toHaveBeenCalled();
      expect(result[0]).not.toHaveProperty('value');
    });
  });

  describe('validateConnections', () => {
    const baseConnection = {
      id: 'conn-1',
      name: connectionName,
      projectId,
      authProviderKey,
      status: AppConnectionStatus.ACTIVE,
    };

    it('should skip validation for OAuth2 connection with authorization_code grant and no refresh token', async () => {
      mockOAuth2Util.shouldSkipValidation.mockReturnValue(true);

      const connectionValue = {
        type: AppConnectionType.OAUTH2,
        access_token: 'access',
        grant_type: OAuth2GrantType.AUTHORIZATION_CODE,
      };

      const connection = {
        ...baseConnection,
        value: `encrypted-${JSON.stringify(connectionValue)}`,
      };

      await appConnectionService.validateConnections(
        connection as unknown as AppConnectionSchema,
      );

      expect(mockOAuth2Util.shouldSkipValidation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppConnectionType.OAUTH2,
          grant_type: OAuth2GrantType.AUTHORIZATION_CODE,
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Skipping connection validation because the OAuth connection does not have a refresh token',
        expect.objectContaining({
          connectionName: connection.name,
          projectId: connection.projectId,
          connectionId: connection.id,
        }),
      );
      expect(mockDistributedLock.acquireLock).not.toHaveBeenCalled();
    });

    it('should skip validation for CLOUD_OAUTH2 connection with no refresh token and no explicit grant_type', async () => {
      mockOAuth2Util.shouldSkipValidation.mockReturnValue(true);

      const connectionValue = {
        type: AppConnectionType.CLOUD_OAUTH2,
        access_token: 'access',
      };

      const connection = {
        ...baseConnection,
        value: `encrypted-${JSON.stringify(connectionValue)}`,
      };

      await appConnectionService.validateConnections(
        connection as unknown as AppConnectionSchema,
      );

      expect(mockOAuth2Util.shouldSkipValidation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppConnectionType.CLOUD_OAUTH2,
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Skipping connection validation because the OAuth connection does not have a refresh token',
        expect.objectContaining({
          connectionId: connection.id,
        }),
      );
      expect(mockDistributedLock.acquireLock).not.toHaveBeenCalled();
    });

    it('should skip validation for PLATFORM_OAUTH2 connection with empty refresh token', async () => {
      mockOAuth2Util.shouldSkipValidation.mockReturnValue(true);

      const connectionValue = {
        type: AppConnectionType.PLATFORM_OAUTH2,
        access_token: 'access',
        grant_type: OAuth2GrantType.AUTHORIZATION_CODE,
        refresh_token: '',
      };

      const connection = {
        ...baseConnection,
        value: `encrypted-${JSON.stringify(connectionValue)}`,
      };

      await appConnectionService.validateConnections(
        connection as unknown as AppConnectionSchema,
      );

      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockDistributedLock.acquireLock).not.toHaveBeenCalled();
    });

    it('should NOT skip validation for OAuth2 connection with a refresh token', async () => {
      mockOAuth2Util.shouldSkipValidation.mockReturnValue(false);
      mockDistributedLock.acquireLock.mockResolvedValue({
        release: jest.fn(),
      });
      findOneByMock.mockResolvedValue(null);

      const connectionValue = {
        type: AppConnectionType.OAUTH2,
        access_token: 'access',
        grant_type: OAuth2GrantType.AUTHORIZATION_CODE,
        refresh_token: 'valid-refresh-token',
      };

      const connection = {
        ...baseConnection,
        value: `encrypted-${JSON.stringify(connectionValue)}`,
      };

      await expect(
        appConnectionService.validateConnections(
          connection as unknown as AppConnectionSchema,
        ),
      ).rejects.toThrow('Failed to refresh connection');

      expect(mockOAuth2Util.shouldSkipValidation).toHaveBeenCalled();
      expect(mockDistributedLock.acquireLock).toHaveBeenCalled();
    });

    it('should NOT skip validation for OAuth2 connection with client_credentials grant type', async () => {
      mockOAuth2Util.shouldSkipValidation.mockReturnValue(false);
      mockDistributedLock.acquireLock.mockResolvedValue({
        release: jest.fn(),
      });
      findOneByMock.mockResolvedValue(null);

      const connectionValue = {
        type: AppConnectionType.OAUTH2,
        access_token: 'access',
        grant_type: OAuth2GrantType.CLIENT_CREDENTIALS,
      };

      const connection = {
        ...baseConnection,
        value: `encrypted-${JSON.stringify(connectionValue)}`,
      };

      await expect(
        appConnectionService.validateConnections(
          connection as unknown as AppConnectionSchema,
        ),
      ).rejects.toThrow('Failed to refresh connection');

      expect(mockOAuth2Util.shouldSkipValidation).toHaveBeenCalled();
      expect(mockDistributedLock.acquireLock).toHaveBeenCalled();
    });
  });
});
