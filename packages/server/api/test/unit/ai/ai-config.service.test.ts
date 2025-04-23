const mockedOpenOpsId = jest.fn().mockReturnValue('mocked-id');

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  openOpsId: mockedOpenOpsId,
}));

const findOneByMock = jest.fn();
const upsertMock = jest.fn();
const findOneByOrFailMock = jest.fn();
const findByMock = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    findOneBy: findOneByMock,
    upsert: upsertMock,
    findOneByOrFail: findOneByOrFailMock,
    findBy: findByMock,
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
    findOneByMock.mockResolvedValue(null);
    findOneByOrFailMock.mockResolvedValue({
      ...baseRequest,
      projectId,
      id: 'mocked-id',
    });

    const result = await aiConfigService.upsert({
      projectId,
      request: baseRequest,
    });

    expect(findOneByMock).toHaveBeenCalledWith({
      projectId,
      provider: baseRequest.provider,
    });
    expect(upsertMock).toHaveBeenCalledWith(
      {
        ...baseRequest,
        projectId,
        apiKey: JSON.stringify('test-encrypt'),
        created: expect.any(String),
        updated: expect.any(String),
        id: 'mocked-id',
      },
      ['projectId', 'provider'],
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
      request: baseRequest,
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
      ['projectId', 'provider'],
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
        apiKey: undefined,
        projectId,
        created: expect.any(String),
        updated: expect.any(String),
      },
      ['projectId', 'provider'],
    );

    expect(encryptStringMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ...baseRequest,
      apiKey: '**REDACTED**',
      id: existingId,
      projectId,
    });
  });

  test('should use request.id if provided explicitly', async () => {
    findOneByMock.mockResolvedValue(null);
    findOneByOrFailMock.mockResolvedValue({
      ...baseRequest,
      id: 'explicit-request-id',
      projectId,
    });

    const requestWithId = {
      ...baseRequest,
      id: 'explicit-request-id',
    };

    const result = await aiConfigService.upsert({
      projectId,
      request: requestWithId,
    });

    expect(upsertMock).toHaveBeenCalledWith(
      {
        ...baseRequest,
        id: 'explicit-request-id',
        projectId,
        apiKey: JSON.stringify('test-encrypt'),
        created: expect.any(String),
        updated: expect.any(String),
      },
      ['projectId', 'provider'],
    );

    expect(mockedOpenOpsId).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ...baseRequest,
      apiKey: '**REDACTED**',
      id: 'explicit-request-id',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return config with redacted apiKey', async () => {
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

    findOneByOrFailMock.mockResolvedValue(config);

    const result = await aiConfigService.get({ projectId, id: configId });

    expect(findOneByOrFailMock).toHaveBeenCalledWith({
      id: configId,
      projectId,
    });
    expect(result).toEqual({
      ...config,
      apiKey: AiApiKeyRedactionMessage,
    });
  });
});

describe('aiConfigService.getActiveConfig', () => {
  const projectId = 'active-project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the enabled AI config with redacted API key', async () => {
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

    findOneByOrFailMock.mockResolvedValue(activeConfig);

    const result = await aiConfigService.getActiveConfig(projectId);

    expect(findOneByOrFailMock).toHaveBeenCalledWith({
      projectId,
      enabled: true,
    });

    expect(result).toEqual({
      ...activeConfig,
      apiKey: AiApiKeyRedactionMessage,
    });
  });

  test('should throw if no active config is found', async () => {
    findOneByOrFailMock.mockRejectedValue(new Error('Not found'));

    await expect(aiConfigService.getActiveConfig(projectId)).rejects.toThrow(
      'Not found',
    );

    expect(findOneByOrFailMock).toHaveBeenCalledWith({
      projectId,
      enabled: true,
    });
  });
});
