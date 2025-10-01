const mockedOpenOpsId = jest.fn().mockReturnValue('mocked-id');

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  openOpsId: mockedOpenOpsId,
}));

const findOneByMock = jest.fn();
const saveMock = jest.fn();
const findOneByOrFailMock = jest.fn();
const findByMock = jest.fn();
const deleteMock = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    findOneBy: findOneByMock,
    save: saveMock,
    findOneByOrFail: findOneByOrFailMock,
    findBy: findByMock,
    delete: deleteMock,
  }),
}));

const encryptStringMock = jest.fn().mockReturnValue('test-encrypt');
jest.mock('@openops/server-shared', () => ({
  system: {
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    getOrThrow: jest.fn(),
    get: jest.fn(),
  },
  AppSystemProp: {
    DB_TYPE: 'DB_TYPE',
  },
  SharedSystemProp: {
    ENABLE_HOST_SESSION: 'ENABLE_HOST_SESSION',
  },
  DatabaseType: {
    SQLITE3: 'SQLITE3',
  },
  encryptUtils: {
    encryptString: encryptStringMock,
  },
}));

jest.mock('../../../src/app/telemetry/event-models/ai', () => ({
  sendAiConfigSavedEvent: jest.fn(),
  sendAiConfigDeletedEvent: jest.fn(),
}));

import { SaveAiConfigRequest } from '@openops/shared';
import { aiConfigService } from '../../../src/app/ai/config/ai-config.service';

describe('aiConfigService.save', () => {
  const baseRequest: SaveAiConfigRequest = {
    connection: 'app-connection-id',
    enabled: true,
  };

  const projectId = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should insert a new ai config when one does not exist', async () => {
    findOneByMock.mockResolvedValue(null);
    saveMock.mockResolvedValue({
      ...baseRequest,
      id: 'mocked-id',
      projectId,
      created: '2025-04-22T12:00:00Z',
      updated: '2025-04-22T12:00:00Z',
    });

    const result = await aiConfigService.save({
      projectId,
      request: baseRequest,
      userId: 'user-id',
    });

    expect(findOneByMock).not.toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledWith({
      ...baseRequest,
      id: 'mocked-id',
      projectId,
      created: expect.any(String),
      updated: expect.any(String),
    });
    expect(result).toMatchObject({
      ...baseRequest,
      id: 'mocked-id',
      projectId,
    });
  });

  test('should update existing ai config if it exists', async () => {
    const existingId = 'existing-id';
    findOneByMock.mockResolvedValue({
      id: existingId,
      created: '2025-04-22T12:00:00Z',
    });
    saveMock.mockResolvedValue({
      ...baseRequest,
      id: existingId,
      projectId,
      created: '2025-04-22T12:00:00Z',
      updated: '2025-04-23T10:00:00Z',
    });

    const result = await aiConfigService.save({
      projectId,
      request: { id: existingId, ...baseRequest },
      userId: 'user-id',
    });

    expect(findOneByMock).toHaveBeenCalledWith({ id: existingId, projectId });
    expect(saveMock).toHaveBeenCalledWith({
      ...baseRequest,
      id: existingId,
      projectId,
      created: '2025-04-22T12:00:00Z',
      updated: expect.any(String),
    });
    expect(result).toMatchObject({
      ...baseRequest,
      id: existingId,
      projectId,
    });
  });
});

describe('aiConfigService.list', () => {
  const projectId = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return all configs for the project', async () => {
    const configs = [
      {
        id: 'id1',
        projectId,
        connection: 'conn-1',
        enabled: true,
        created: '2025-04-22T12:00:00Z',
        updated: '2025-04-22T12:00:00Z',
      },
      {
        id: 'id2',
        projectId,
        connection: 'conn-2',
        enabled: false,
        created: '2025-04-22T12:00:00Z',
        updated: '2025-04-22T12:00:00Z',
      },
    ];

    findByMock.mockResolvedValue(configs);

    const result = await aiConfigService.list(projectId);

    expect(findByMock).toHaveBeenCalledWith({ projectId });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(configs[0]);
    expect(result[1]).toEqual(configs[1]);
  });
});

describe('aiConfigService.get', () => {
  const projectId = 'test-project';
  const configId = 'config-id-123';

  const config = {
    id: configId,
    projectId,
    connection: 'conn-1',
    enabled: true,
    created: '2025-04-22T12:00:00Z',
    updated: '2025-04-22T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return config by id and project', async () => {
    findOneByMock.mockResolvedValue({ ...config });

    const result = await aiConfigService.get({ projectId, id: configId });

    expect(findOneByMock).toHaveBeenCalledWith({
      id: configId,
      projectId,
    });

    expect(result).toEqual(config);
  });

  test('should return undefined if config is not found', async () => {
    findOneByMock.mockResolvedValue(undefined);

    const result = await aiConfigService.get({ projectId, id: configId });

    expect(result).toBeUndefined();
    expect(findOneByMock).toHaveBeenCalledWith({
      id: configId,
      projectId,
    });
  });
});

describe('aiConfigService.getActiveConfig', () => {
  const projectId = 'active-project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const activeConfig = {
    id: 'active-id',
    projectId,
    connection: 'conn-active',
    created: '2025-04-01T10:00:00Z',
    updated: '2025-04-21T14:00:00Z',
    enabled: true,
  };

  test('should return the enabled AI config', async () => {
    findOneByMock.mockResolvedValue(activeConfig);

    const result = await aiConfigService.getActiveConfig(projectId);

    expect(findOneByMock).toHaveBeenCalledWith({
      projectId,
      enabled: true,
    });

    expect(result).toEqual(activeConfig);
  });

  test('should return undefined if no config is found', async () => {
    findOneByMock.mockResolvedValue(undefined);

    const result = await aiConfigService.getActiveConfig(projectId);

    expect(result).toBeUndefined();
    expect(findOneByMock).toHaveBeenCalledWith({
      projectId,
      enabled: true,
    });
  });
});

describe('aiConfigService.delete', () => {
  const projectId = 'test-project';
  const configId = 'config-id-456';

  const config = {
    id: configId,
    projectId,
    connection: 'conn-1',
    created: '2025-04-22T12:00:00Z',
    updated: '2025-04-22T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete the config if it exists', async () => {
    findOneByMock.mockResolvedValue(config);
    deleteMock.mockResolvedValue(undefined);

    await expect(
      aiConfigService.delete({ projectId, id: configId, userId: 'user-id' }),
    ).resolves.not.toThrow();

    expect(findOneByMock).toHaveBeenCalledWith({ id: configId, projectId });
    expect(deleteMock).toHaveBeenCalledWith({ id: configId });
  });

  test('should throw an error if the config does not exist', async () => {
    findOneByMock.mockResolvedValue(undefined);

    await expect(
      aiConfigService.delete({ projectId, id: configId, userId: 'user-id' }),
    ).rejects.toThrow('Config not found or does not belong to this project');

    expect(findOneByMock).toHaveBeenCalledWith({ id: configId, projectId });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
