import { AiConfig } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { setupServer } from '../../../../src/app/server';

const upsertMock = jest.fn();
jest.mock('../../../../src/modules/ai-config/ai-config.service', () => ({
  aiConfigService: {
    upsert: upsertMock,
  },
}));

describe('POST /v1/ai-config', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const mockPrincipal = {
    id: 'user-123',
    projectId: 'project-abc',
  };

  const mockAiConfig: AiConfig = {
    id: 'config-001',
    projectId: mockPrincipal.projectId,
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'sk-secret-key',
    modelSettings: { temperature: 0.7 },
    enabled: true,
    created: 'created',
    updated: 'updated',
  };

  const makeRequest = (body = {}) => {
    return app.inject({
      method: 'POST',
      url: '/v1/ai/config',
      payload: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'sk-secret-key',
        modelSettings: { temperature: 0.7 },
        enabled: true,
        ...body,
      },
      headers: {
        authorization: 'Bearer fake-token',
      },
    });
  };

  test('should upsert and return ai config with status 201', async () => {
    upsertMock.mockResolvedValueOnce(mockAiConfig);

    const response = await makeRequest();

    expect(response.statusCode).toBe(StatusCodes.CREATED);
    expect(response.json()).toEqual(mockAiConfig);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: mockPrincipal.projectId,
        userId: mockPrincipal.id,
        request: expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'sk-secret-key',
          modelSettings: { temperature: 0.7 },
          enabled: true,
        }),
      }),
    );
  });

  test('should return 500 if service throws', async () => {
    upsertMock.mockRejectedValueOnce(new Error('DB error'));

    const response = await makeRequest();

    expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.json()).toMatchObject({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
    });
  });
});
