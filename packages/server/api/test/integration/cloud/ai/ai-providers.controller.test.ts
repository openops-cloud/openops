const getAvailableProvidersWithModelsMock = jest.fn();
jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  getAvailableProvidersWithModels: getAvailableProvidersWithModelsMock,
}));

import { GetProvidersResponse } from '@openops/shared';
import { FastifyInstance } from 'fastify';
import { setupServer } from '../../../../src/app/server';

describe('GET /v1/ai/providers', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should return list of AI providers with models', async () => {
    const mockResponse: GetProvidersResponse[] = [
      {
        aiProvider: 'OPENAI',
        displayName: 'openai'
        models: ['gpt-3.5-turbo', 'gpt-4'],
      },
      {
        provider: 'ANTHROPIC',
        displayName: 'anthropic'
        models: ['claude-2'],
      },
    ];

    getAvailableProvidersWithModelsMock.mockReturnValueOnce(mockResponse);

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/ai/providers',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockResponse);
    expect(getAvailableProvidersWithModelsMock).toHaveBeenCalledTimes(1);
  });

  test('should return 500 if getAvailableProvidersWithModels throws an error', async () => {
    getAvailableProvidersWithModelsMock.mockImplementation(() => {
      throw new Error('Unexpected failure');
    });

    const response = await app?.inject({
      method: 'GET',
      url: '/v1/ai/providers',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
});
