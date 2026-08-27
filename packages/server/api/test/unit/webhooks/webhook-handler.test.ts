const mockFlowRunServiceStart = jest.fn().mockResolvedValue({ id: 'run-id' });

jest.mock('../../../src/app/flows/flow-run/flow-run-service', () => ({
  flowRunService: {
    start: mockFlowRunServiceStart,
  },
}));

const mockFindOneBy = jest.fn();
jest.mock('../../../src/app/flows/flow/flow.repo', () => ({
  flowRepo: () => ({
    findOneBy: mockFindOneBy,
  }),
}));

const mockOneTimeListener = jest.fn().mockResolvedValue({
  status: 200,
  body: {},
  headers: {},
});
jest.mock('../../../src/app/workers/helper/webhook-response-watcher', () => ({
  webhookResponseWatcher: {
    getServerId: jest.fn().mockReturnValue('server-id'),
    oneTimeListener: mockOneTimeListener,
  },
}));

jest.mock('../../../src/app/workers/queue', () => ({
  flowQueue: {
    add: jest.fn(),
  },
}));

jest.mock('../../../src/app/workers/queue/queue-manager', () => ({
  getJobPriority: jest.fn().mockResolvedValue(1),
}));

import '@fastify/multipart';

import { FlowStatus, ProgressUpdateType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { handleWebhook } from '../../../src/app/webhooks/webhook-handler';

describe('webhook-handler handleWebhook', () => {
  const flowId = 'flow-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockFlowRunServiceStart.mockResolvedValue({ id: 'run-id' });
    mockOneTimeListener.mockResolvedValue({
      status: 200,
      body: {},
      headers: {},
    });
    mockFindOneBy.mockResolvedValue({
      id: flowId,
      projectId: 'project-id',
      status: FlowStatus.ENABLED,
      publishedVersionId: 'published-version-id',
    });
  });

  const buildRequest = (): FastifyRequest =>
    ({
      method: 'POST',
      headers: {},
      query: {},
      body: {},
      isMultipart: () => false,
    }) as unknown as FastifyRequest;

  it('uses WEBHOOK_RESPONSE_ON_PAUSE when allowPauseResponse is true', async () => {
    await handleWebhook({
      request: buildRequest(),
      flowId,
      async: false,
      allowPauseResponse: true,
    });

    expect(mockFlowRunServiceStart).toHaveBeenCalledWith(
      expect.objectContaining({
        progressUpdateType: ProgressUpdateType.WEBHOOK_RESPONSE_ON_PAUSE,
      }),
    );
  });

  it('uses WEBHOOK_RESPONSE when allowPauseResponse is omitted', async () => {
    await handleWebhook({
      request: buildRequest(),
      flowId,
      async: false,
    });

    expect(mockFlowRunServiceStart).toHaveBeenCalledWith(
      expect.objectContaining({
        progressUpdateType: ProgressUpdateType.WEBHOOK_RESPONSE,
      }),
    );
  });

  it('uses WEBHOOK_RESPONSE and undefined synchronousHandlerId for async requests', async () => {
    await handleWebhook({
      request: buildRequest(),
      flowId,
      async: true,
    });

    expect(mockFlowRunServiceStart).toHaveBeenCalledWith(
      expect.objectContaining({
        progressUpdateType: ProgressUpdateType.WEBHOOK_RESPONSE,
        synchronousHandlerId: undefined,
      }),
    );
  });
});
