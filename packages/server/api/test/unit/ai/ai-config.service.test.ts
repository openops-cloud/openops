const mockedOpenOpsId = jest.fn().mockReturnValue('mocked-id');

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  openOpsId: mockedOpenOpsId,
}));

const findOneByMock = jest.fn();
const upsertMock = jest.fn();
const findOneByOrFailMock = jest.fn();
const findByMock = jest.fn();
const deleteMock = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    findOneBy: findOneByMock,
    upsert: upsertMock,
    findOneByOrFail: findOneByOrFailMock,
    findBy: findByMock,
    delete: deleteMock,
  }),
}));

const encryptStringMock = jest.fn().mockReturnValue('test-encrypt');

jest.mock('../../../src/app/helper/encryption', () => ({
  ...jest.requireActual('../../../src/app/helper/encryption'),
  encryptUtils: {
    encryptString: encryptStringMock,
  },
}));

import { AiProviderEnum, SaveAiConfigRequest } from '@openops/shared';
import { AiApiKeyRedactionMessage } from '../../../src/app/ai/config/ai-config.entity';
import { aiConfigService } from '../../../src/app/ai/config/ai-config.service';

describe('aiConfigService.upsert', () => {
  const baseRequest: SaveAiConfigRequest = {
    provider: AiProviderEnum.OPENAI,
    apiKey: 'test-key',
    model: 'gpt-4',
    modelSettings: { temperature: 0.7 },
    providerSettings: { baseUrl: 'url' },
  };

  const projectId = 'test-project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should insert a new ai config when one does not exist', async () => {
    findOneByOrFailMock.mockResolvedValue({
      ...baseRequest,
      projectId,
      id: 'mocked-id',
    });

    const result = await aiConfigService.upsert({
      projectId,
      request: baseRequest,
    });

    expect(findOneByMock).not.toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledWith(
      {
        ...baseRequest,
        projectId,
        apiKey: JSON.stringify('test-encrypt'),
        created: expect.any(String),
        updated: expect.any(String),
        id: 'mocked-id',
      },
      ['id'],
    );
    expect(findOneByOrFailMock).toHaveBeenCalledWith({
      projectId,
      provider: baseRequest.provider,
    });
    expect(result).toMatchObject({
      ...baseRequest,
      projectId,
      apiKey: '**REDACTED**',
      id: 'mocked-id',
    });
    expect(encryptStringMock).toHaveBeenCalledWith(baseRequest.apiKey);
  });

  test('should update existing ai config if it exists', async () => {
    const existingId = 'existing-id';
    findOneByMock.mockResolvedValue({ id: existingId });
    const fakeTimestamp = '2025-04-22T12:00:00Z';
    findOneByOrFailMock.mockResolvedValue({
      ...baseRequest,
      id: existingId,
      projectId,
      created: fakeTimestamp,
      updated: fakeTimestamp,
    });

    const result = await aiConfigService.upsert({
      projectId,
      request: { id: existingId, ...baseRequest },
    });

    expect(upsertMock).toHaveBeenCalledWith(
      {
        ...baseRequest,
        id: existingId,
        projectId,
        apiKey: JSON.stringify('test-encrypt'),
        created: expect.any(String),
        updated: expect.any(String),
      },
      ['id'],
    );
    expect(encryptStringMock).toHaveBeenCalledWith(baseRequest.apiKey);
    expect(result).toMatchObject({
      ...baseRequest,
      id: existingId,
      projectId,
      apiKey: '**REDACTED**',
      created: expect.any(String),
      updated: expect.any(String),
    });
  });

  test('should not overwrite apiKey if redacted message is received', async () => {
    const existingId = 'existing-id';
    const existingApiKey = 'already-encrypted-key';

    findOneByMock.mockResolvedValue({ id: existingId, apiKey: existingApiKey });
    findOneByOrFailMock.mockResolvedValue({
      ...baseRequest,
      id: existingId,
      projectId,
      apiKey: existingApiKey,
    });

    const redactedRequest = {
      ...baseRequest,
      id: existingId,
      apiKey: AiApiKeyRedactionMessage,
    };

    const result = await aiConfigService.upsert({
      projectId,
      request: redactedRequest,
    });

    expect(upsertMock).toHaveBeenCalledWith(
      {
        ...baseRequest,
        id: existingId,
        apiKey: existingApiKey,
        projectId,
        created: expect.any(String),
        updated: expect.any(String),
      },
      ['id'],
    );

    expect(encryptStringMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ...baseRequest,
      apiKey: '**REDACTED**',
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

  test('should return redacted apiKeys for all configs in the list', async () => {
    const configs = [
      {
        id: 'id1',
        projectId,
        provider: AiProviderEnum.OPENAI,
        apiKey: 'encrypted-key-1',
        model: 'gpt-4',
        modelSettings: {},
        providerSettings: {},
        created: '2025-04-22T12:00:00Z',
        updated: '2025-04-22T12:00:00Z',
      },
      {
        id: 'id2',
        projectId,
        provider: AiProviderEnum.ANTHROPIC,
        apiKey: 'encrypted-key-2',
        model: 'claude',
        modelSettings: {},
        providerSettings: {},
        created: '2025-04-22T12:00:00Z',
        updated: '2025-04-22T12:00:00Z',
      },
    ];

    findByMock.mockResolvedValue(configs);

    const result = await aiConfigService.list(projectId);

    expect(findByMock).toHaveBeenCalledWith({ projectId });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      ...configs[0],
      apiKey: AiApiKeyRedactionMessage,
    });
    expect(result[1]).toEqual({
      ...configs[1],
      apiKey: AiApiKeyRedactionMessage,
    });
  });
});

describe('aiConfigService.get', () => {
  const projectId = 'test-project';
  const configId = 'config-id-123';

  const config = {
    id: configId,
    projectId,
    provider: AiProviderEnum.OPENAI,
    apiKey: 'encrypted-key',
    model: 'gpt-4',
    modelSettings: {},
    providerSettings: {},
    created: '2025-04-22T12:00:00Z',
    updated: '2025-04-22T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return config with redacted apiKey if shouldRedact is true', async () => {
    findOneByMock.mockResolvedValue({ ...config });

    const result = await aiConfigService.get({ projectId, id: configId }, true);

    expect(findOneByMock).toHaveBeenCalledWith({
      id: configId,
      projectId,
    });

    expect(result).toEqual({
      ...config,
      apiKey: AiApiKeyRedactionMessage,
    });
  });

  test('should return config with original apiKey if shouldRedact is false', async () => {
    findOneByMock.mockResolvedValue({ ...config });

    const result = await aiConfigService.get(
      { projectId, id: configId },
      false,
    );

    expect(findOneByMock).toHaveBeenCalledWith({
      id: configId,
      projectId,
    });

    expect(result).toEqual(config);
  });

  test('should return undefined if config is not found', async () => {
    findOneByMock.mockResolvedValue(undefined);

    const result = await aiConfigService.get({ projectId, id: configId }, true);

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
    provider: AiProviderEnum.OPENAI,
    apiKey: 'encrypted-key',
    model: 'gpt-4',
    modelSettings: { temperature: 0.9 },
    providerSettings: { baseUrl: 'https://api.openai.com' },
    created: '2025-04-01T10:00:00Z',
    updated: '2025-04-21T14:00:00Z',
    enabled: true,
  };

  test('should return the enabled AI config with redacted API key if redacted=true', async () => {
    findOneByMock.mockResolvedValue(activeConfig);

    const result = await aiConfigService.getActiveConfig(projectId, true);

    expect(findOneByMock).toHaveBeenCalledWith({
      projectId,
      enabled: true,
    });

    expect(result).toEqual({
      ...activeConfig,
      apiKey: AiApiKeyRedactionMessage,
    });
  });

  test('should return the enabled AI config with original API key if redacted=false', async () => {
    findOneByMock.mockResolvedValue(activeConfig);

    const result = await aiConfigService.getActiveConfig(projectId, false);

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
    provider: AiProviderEnum.OPENAI,
    apiKey: 'encrypted-key',
    model: 'gpt-4',
    modelSettings: {},
    providerSettings: {},
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
      aiConfigService.delete({ projectId, id: configId }),
    ).resolves.not.toThrow();

    expect(findOneByMock).toHaveBeenCalledWith({ id: configId, projectId });
    expect(deleteMock).toHaveBeenCalledWith({ id: configId });
  });

  test('should throw an error if the config does not exist', async () => {
    findOneByMock.mockResolvedValue(undefined);

    await expect(
      aiConfigService.delete({ projectId, id: configId }),
    ).rejects.toThrow('Config not found or does not belong to this project');

    expect(findOneByMock).toHaveBeenCalledWith({ id: configId, projectId });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
