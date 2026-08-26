const mockHandleWebhook = jest.fn();
const mockHandleWebhookSimulation = jest.fn();

jest.mock('../../../src/app/webhooks/webhook-handler', () => ({
  handleWebhook: mockHandleWebhook,
  handleWebhookSimulation: mockHandleWebhookSimulation,
}));

import fastify, { FastifyInstance } from 'fastify';
import { webhookController } from '../../../src/app/webhooks/webhook-controller';

describe('webhookController /:flowId/sync route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify();
    await app.register(webhookController, { prefix: '/v1/webhooks' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleWebhook.mockResolvedValue({
      status: 200,
      body: {},
      headers: {},
    });
  });

  it('passes respondOnPause=true to the handler', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync?respondOnPause=true',
    });

    expect(response.statusCode).toBe(200);
    expect(mockHandleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'aaaaaaaaaaaaaaaaaaaaa',
        async: false,
        respondOnPause: true,
      }),
    );
  });

  it.each([
    ['respondOnPause=false', false],
    ['', false],
  ])(
    'passes respondOnPause=false to the handler for query "%s"',
    async (query, expected) => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync${
          query ? `?${query}` : ''
        }`,
      });

      expect(response.statusCode).toBe(200);
      expect(mockHandleWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          async: false,
          respondOnPause: expected,
        }),
      );
    },
  );

  it('rejects a non-boolean respondOnPause value with 400 without invoking the handler', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync?respondOnPause=banana',
    });

    expect(response.statusCode).toBe(400);
    expect(mockHandleWebhook).not.toHaveBeenCalled();
  });

  it('still accepts arbitrary caller query params alongside respondOnPause', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync?respondOnPause=true&customerId=42&source=zapier',
    });

    expect(response.statusCode).toBe(200);
    expect(mockHandleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ respondOnPause: true }),
    );
  });

  it('does not enable respondOnPause on the async route', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa?respondOnPause=true',
    });

    expect(response.statusCode).toBe(200);
    const callArgs = mockHandleWebhook.mock.calls[0][0];
    expect(callArgs.async).toBe(true);
    expect(callArgs.respondOnPause ?? false).toBe(false);
  });
});
