import { makeHttpRequest } from '@openops/common';
import { logger } from '@openops/server-shared';
import { EngineHttpResponse } from '@openops/shared';
import { AxiosHeaders } from 'axios';
import { createWebhookResponseHook } from '../../src/lib/handler/create-webhook-response-hook';
import { generateMockEngineConstants } from './test-helper';

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

jest.mock('@openops/server-shared', () => ({
  logger: {
    warn: jest.fn(),
  },
  system: {
    get: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    getOrThrow: jest.fn(),
  },
  SharedSystemProp: {
    EXECUTION_MODE: 'EXECUTION_MODE',
  },
}));

describe('createWebhookResponseHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each(['serverHandlerId', 'executionCorrelationId'])(
    'should skip when %p is missing', async (param: string) => {
    const constants = generateMockEngineConstants({
      executionCorrelationId: 'test-correlation-id',
      serverHandlerId: 'test-server-handler-id',
      flowRunId: 'test-flow-run-id',
    });
    Object.assign(constants, { [param]: null });

    const response: EngineHttpResponse = {
      status: 200,
      body: {},
      headers: {},
    };

    const hook = createWebhookResponseHook(constants);
    await hook(response);

    expect(logger.warn).toHaveBeenCalledWith(
      'Skipping webhook response due to missing required identifiers',
      {
        flowRunId: 'test-flow-run-id',
      },
    );
    expect(makeHttpRequest).not.toHaveBeenCalled();
  });

  it('should call makeHttpRequest with correct parameters', async () => {
    const constants = generateMockEngineConstants({
      serverHandlerId: 'test-handler-id',
      executionCorrelationId: 'test-correlation-id',
      internalApiUrl: 'http://localhost:3000/',
      engineToken: 'test-token',
      flowRunId: 'test-flow-run-id',
    });
    const response: EngineHttpResponse = {
      status: 200,
      body: { foo: 'bar' },
      headers: { 'x-test': 'test' },
    };

    const hook = createWebhookResponseHook(constants);
    await hook(response);

    expect(makeHttpRequest).toHaveBeenCalledWith(
      'POST',
      'http://localhost:3000/v1/engine/send-webhook-response',
      expect.any(AxiosHeaders),
      {
        workerHandlerId: 'test-handler-id',
        flowRunId: 'test-flow-run-id',
        response,
      },
      expect.objectContaining({
        retries: 3,
      }),
    );

    const headers = (makeHttpRequest as jest.Mock).mock.calls[0][2] as AxiosHeaders;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });
});
