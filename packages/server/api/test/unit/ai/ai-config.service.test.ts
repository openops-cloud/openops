const mockedOpenOpsId = jest.fn().mockReturnValue('mocked-id');

jest.mock('@openops/shared', () => ({
  ...jest.requireActual('@openops/shared'),
  openOpsId: mockedOpenOpsId,
}));

const findOneByMock = jest.fn();
const upsertMock = jest.fn();
const findOneByOrFailMock = jest.fn();

jest.mock('../../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../../src/app/core/db/repo-factory'),
  repoFactory: () => () => ({
    findOneBy: findOneByMock,
    upsert: upsertMock,
    findOneByOrFail: findOneByOrFailMock,
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
