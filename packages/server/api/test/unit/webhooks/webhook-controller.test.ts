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

  it('passes allowPauseResponse=true through to the handler', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync?allowPauseResponse=true',
    });

    expect(response.statusCode).toBe(200);
    expect(mockHandleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'aaaaaaaaaaaaaaaaaaaaa',
        async: false,
        allowPauseResponse: true,
      }),
    );
  });

  it('passes an undefined allowPauseResponse to the handler when it is omitted', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync',
    });

    expect(response.statusCode).toBe(200);
    expect(mockHandleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        async: false,
        allowPauseResponse: undefined,
      }),
    );
  });

  it('passes allowPauseResponse=false through to the handler', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync?allowPauseResponse=false',
    });

    expect(response.statusCode).toBe(200);
    expect(mockHandleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ allowPauseResponse: false }),
    );
  });

  it.each(['paused', 'banana', 'yes', 'TRUE'])(
    'rejects allowPauseResponse=%s with 400 without invoking the handler',
    async (value) => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync?allowPauseResponse=${value}`,
      });

      expect(response.statusCode).toBe(400);
      expect(mockHandleWebhook).not.toHaveBeenCalled();
    },
  );

  it('still accepts arbitrary caller query params alongside allowPauseResponse', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa/sync?allowPauseResponse=true&customerId=42&source=zapier',
    });

    expect(response.statusCode).toBe(200);
    expect(mockHandleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ allowPauseResponse: true }),
    );
  });

  it('ignores allowPauseResponse on the async route', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/aaaaaaaaaaaaaaaaaaaaa?allowPauseResponse=true',
    });

    expect(response.statusCode).toBe(200);
    const callArgs = mockHandleWebhook.mock.calls[0][0];
    expect(callArgs.async).toBe(true);
    expect(callArgs.allowPauseResponse).toBeUndefined();
  });
});
