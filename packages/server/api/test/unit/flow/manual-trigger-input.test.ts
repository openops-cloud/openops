import { TriggerStrategy } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { TriggerHookType, TriggerType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { engineRunner, webhookUtils } from 'server-worker';
import { accessTokenManager } from '../../../src/app/authentication/context/access-token-manager';
import { prepareManualTriggerInput } from '../../../src/app/flows/flow/manual-trigger-input';
import { triggerUtils } from '../../../src/app/flows/trigger/hooks/trigger-utils';

jest.mock('@openops/server-shared', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

jest.mock('server-worker', () => ({
  engineRunner: {
    executeTrigger: jest.fn(),
  },
  webhookUtils: {
    getWebhookUrl: jest.fn(),
  },
}));

jest.mock(
  '../../../src/app/authentication/context/access-token-manager',
  () => ({
    accessTokenManager: {
      generateEngineToken: jest.fn(),
    },
  }),
);

jest.mock('../../../src/app/flows/trigger/hooks/trigger-utils', () => ({
  triggerUtils: {
    getBlockTriggerOrThrow: jest.fn(),
  },
}));

describe('Manual Trigger Input', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success false if trigger type is not BLOCK', async () => {
    const request = {
      principal: { projectId: 'project-1' },
    } as unknown as FastifyRequest;

    const flow = {
      version: {
        trigger: {
          type: TriggerType.EMPTY,
        },
      },
    };

    const result = await prepareManualTriggerInput(request, flow as never);

    expect(result).toEqual({
      success: false,
      message: 'Trigger type is not a block: type: EMPTY',
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should return success false if getBlockTriggerOrThrow throws', async () => {
    const request = {
      principal: { projectId: 'project-1' },
    } as unknown as FastifyRequest;

    const flow = {
      version: {
        trigger: {
          type: TriggerType.BLOCK,
        },
      },
    };

    (triggerUtils.getBlockTriggerOrThrow as jest.Mock).mockRejectedValue(
      new Error('Trigger not found'),
    );

    const result = await prepareManualTriggerInput(request, flow as never);

    expect(result).toEqual({
      success: false,
      message:
        'Something went wrong while validating the trigger type. Trigger not found',
    });
  });

  it('should handle SCHEDULED trigger strategy successfully', async () => {
    const request = {
      principal: { projectId: 'project-1' },
    } as unknown as FastifyRequest;

    const flow = {
      version: {
        flowId: 'flow-1',
        trigger: {
          type: TriggerType.BLOCK,
        },
      },
    };

    (triggerUtils.getBlockTriggerOrThrow as jest.Mock).mockResolvedValue({
      type: TriggerStrategy.SCHEDULED,
    });
    (accessTokenManager.generateEngineToken as jest.Mock).mockResolvedValue(
      'engine-token',
    );
    (webhookUtils.getWebhookUrl as jest.Mock).mockResolvedValue(
      'http://webhook.url',
    );
    (engineRunner.executeTrigger as jest.Mock).mockResolvedValue({
      result: {
        success: true,
        output: [{ foo: 'bar' }],
      },
    });

    const result = await prepareManualTriggerInput(request, flow as never);

    expect(result).toEqual({
      success: true,
      payload: { foo: 'bar' },
    });
    expect(engineRunner.executeTrigger).toHaveBeenCalledWith('engine-token', {
      hookType: TriggerHookType.RUN,
      flowVersion: flow.version,
      webhookUrl: 'http://webhook.url',
      projectId: 'project-1',
      test: false,
    });
  });

  it('should return empty payload for SCHEDULED trigger if result is unsuccessful', async () => {
    const request = {
      principal: { projectId: 'project-1' },
    } as unknown as FastifyRequest;

    const flow = {
      version: {
        flowId: 'flow-1',
        trigger: {
          type: TriggerType.BLOCK,
        },
      },
    };

    (triggerUtils.getBlockTriggerOrThrow as jest.Mock).mockResolvedValue({
      type: TriggerStrategy.SCHEDULED,
    });
    (accessTokenManager.generateEngineToken as jest.Mock).mockResolvedValue(
      'engine-token',
    );
    (webhookUtils.getWebhookUrl as jest.Mock).mockResolvedValue(
      'http://webhook.url',
    );
    (engineRunner.executeTrigger as jest.Mock).mockResolvedValue({
      result: {
        success: false,
      },
    });

    const result = await prepareManualTriggerInput(request, flow as never);

    expect(result).toEqual({
      success: true,
      payload: {},
    });
  });

  it('should return success true for WEBHOOK trigger strategy', async () => {
    const request = {
      principal: { projectId: 'project-1' },
      query: { param: 'value' },
    } as unknown as FastifyRequest;

    const flow = {
      version: {
        trigger: {
          type: TriggerType.BLOCK,
        },
      },
    };

    (triggerUtils.getBlockTriggerOrThrow as jest.Mock).mockResolvedValue({
      type: TriggerStrategy.WEBHOOK,
    });

    const result = await prepareManualTriggerInput(request, flow as never);

    expect(result).toEqual({
      success: true,
      payload: {
        body: {},
        headers: {},
        queryParams: { param: 'value' },
      },
    });
  });

  it('should return success false for unsupported trigger strategy', async () => {
    const request = {
      principal: { projectId: 'project-1' },
    } as unknown as FastifyRequest;

    const flow = {
      version: {
        trigger: {
          type: TriggerType.BLOCK,
        },
      },
    };

    (triggerUtils.getBlockTriggerOrThrow as jest.Mock).mockResolvedValue({
      type: 'UNSUPPORTED',
    });

    const result = await prepareManualTriggerInput(request, flow as never);

    expect(result).toEqual({
      success: false,
      message: 'Only scheduled and webhook workflows can be triggered manually',
    });
  });
});
