import {
  PopulatedFlow,
  SeekPage,
  TriggerEvent,
  TriggerType,
} from '@openops/shared';
import { engineRunner, webhookUtils } from 'server-worker';
import { accessTokenManager } from '../../src/app/authentication/context/access-token-manager';
import { triggerEventService } from '../../src/app/flows/trigger-events/trigger-event.service';

const mockRepo = {
  delete: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn(),
};

jest.mock('../../src/app/core/db/repo-factory', () => ({
  ...jest.requireActual('../../src/app/core/db/repo-factory'),
  repoFactory: () => () => mockRepo,
}));

jest.mock('server-worker', () => ({
  engineRunner: { executeTrigger: jest.fn() },
  webhookUtils: { getWebhookUrl: jest.fn() },
}));

jest.mock('../../src/app/authentication/context/access-token-manager', () => ({
  accessTokenManager: { generateEngineToken: jest.fn() },
}));

const emptyPage: SeekPage<TriggerEvent> = {
  data: [],
  next: null,
  previous: null,
};
jest.mock('../../src/app/helper/pagination/pagination-utils', () => ({
  paginationHelper: { createPage: jest.fn(() => emptyPage) },
}));

describe('triggerEventService.test', () => {
  const projectId = 'proj_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs BLOCK trigger test, saves outputs, clears previous events, and returns list', async () => {
    const flow = {
      id: 'flow_1',
      version: {
        id: 'v1',
        trigger: {
          type: TriggerType.BLOCK,
          id: 'step_1',
          settings: {
            blockName: 'test-block',
            blockVersion: '1.2.3',
            triggerName: 'onEvent',
          },
        },
      },
    } as PopulatedFlow;

    (accessTokenManager.generateEngineToken as jest.Mock).mockResolvedValue(
      'engine_token',
    );
    (webhookUtils.getWebhookUrl as jest.Mock).mockResolvedValue(
      'http://webhook/url',
    );
    const outputs = [{ a: 1 }, { a: 2 }];
    (engineRunner.executeTrigger as jest.Mock).mockResolvedValue({
      result: {
        success: true,
        input: { foo: 'bar' },
        output: outputs,
      },
    });

    const listSpy = jest.spyOn(triggerEventService, 'list').mockResolvedValue({
      data: [
        {
          id: 'te_1',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          projectId,
          flowId: flow.id,
          sourceName: 'test-source',
          payload: { a: 1 },
          input: { foo: 'bar' },
        },
      ],
      next: 'CUR',
      previous: null,
    });
    const saveEventSpy = jest
      .spyOn(triggerEventService, 'saveEvent')
      .mockResolvedValue({
        id: 'te_saved',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        projectId,
        flowId: flow.id,
        sourceName: 'test-source',
        payload: {},
        input: {},
      });

    const page = await triggerEventService.test({ projectId, flow });

    expect(accessTokenManager.generateEngineToken).toHaveBeenCalledWith({
      projectId,
    });
    expect(webhookUtils.getWebhookUrl).toHaveBeenCalledWith({
      flowId: flow.id,
      simulate: true,
    });
    expect(engineRunner.executeTrigger).toHaveBeenCalled();

    expect(mockRepo.delete).toHaveBeenCalledWith({
      projectId,
      flowId: flow.id,
    });

    expect(saveEventSpy).toHaveBeenCalledTimes(outputs.length);
    expect(saveEventSpy).toHaveBeenNthCalledWith(1, {
      projectId,
      flowId: flow.id,
      payload: outputs[0],
      input: { foo: 'bar' },
    });
    expect(saveEventSpy).toHaveBeenNthCalledWith(2, {
      projectId,
      flowId: flow.id,
      payload: outputs[1],
      input: { foo: 'bar' },
    });

    expect(listSpy).toHaveBeenCalledWith({
      projectId,
      flow,
      cursor: null,
      limit: outputs.length,
    });
    expect(page).toEqual({
      data: [
        {
          id: 'te_1',
          created: expect.any(String),
          updated: expect.any(String),
          projectId,
          flowId: flow.id,
          sourceName: 'test-source',
          payload: { a: 1 },
          input: { foo: 'bar' },
        },
      ],
      next: 'CUR',
      previous: null,
    });
  });

  it('when BLOCK trigger test has no outputs, saves a single null-payload event and returns list with limit 0', async () => {
    const flow = {
      id: 'flow_2',
      version: {
        id: 'v1',
        trigger: {
          type: TriggerType.BLOCK,
          id: 'step_2',
          settings: {
            blockName: 'test-block',
            blockVersion: '1.2.3',
            triggerName: 'onEvent',
          },
        },
      },
    } as PopulatedFlow;

    (accessTokenManager.generateEngineToken as jest.Mock).mockResolvedValue(
      'engine_token',
    );
    (webhookUtils.getWebhookUrl as jest.Mock).mockResolvedValue(
      'http://webhook/url',
    );
    (engineRunner.executeTrigger as jest.Mock).mockResolvedValue({
      result: {
        success: true,
        input: { baz: 42 },
        output: [],
      },
    });

    const listSpy = jest
      .spyOn(triggerEventService, 'list')
      .mockResolvedValue({ data: [], next: 'NEXT', previous: null });
    const saveEventSpy = jest
      .spyOn(triggerEventService, 'saveEvent')
      .mockResolvedValue({
        id: 'te_saved2',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        projectId,
        flowId: flow.id,
        sourceName: 'test-source',
        payload: null,
        input: { baz: 42 },
      });

    const page = await triggerEventService.test({ projectId, flow });

    expect(mockRepo.delete).toHaveBeenCalledWith({
      projectId,
      flowId: flow.id,
    });

    expect(saveEventSpy).toHaveBeenCalledTimes(1);
    expect(saveEventSpy).toHaveBeenCalledWith({
      projectId,
      flowId: flow.id,
      payload: null,
      input: { baz: 42 },
    });

    expect(listSpy).toHaveBeenCalledWith({
      projectId,
      flow,
      cursor: null,
      limit: 0,
    });
    expect(page).toEqual({ data: [], next: 'NEXT', previous: null });
  });

  it('throws ApplicationError when BLOCK trigger test fails', async () => {
    const flow = {
      id: 'flow_3',
      version: {
        id: 'v1',
        trigger: {
          type: TriggerType.BLOCK,
          id: 'step_3',
          settings: {
            blockName: 'test-block',
            blockVersion: '1.2.3',
            triggerName: 'onEvent',
          },
        },
      },
    } as PopulatedFlow;

    (accessTokenManager.generateEngineToken as jest.Mock).mockResolvedValue(
      'engine_token',
    );
    (webhookUtils.getWebhookUrl as jest.Mock).mockResolvedValue(
      'http://webhook/url',
    );
    (engineRunner.executeTrigger as jest.Mock).mockResolvedValue({
      result: {
        success: false,
        message: 'Failure reason',
        input: { x: 1 },
        output: [],
      },
    });

    await expect(
      triggerEventService.test({ projectId, flow }),
    ).rejects.toThrowError('TEST_TRIGGER_FAILED');
  });

  it('returns empty page for EMPTY trigger', async () => {
    const flow = {
      id: 'flow_empty',
      version: {
        id: 'vEmpty',
        trigger: { type: TriggerType.EMPTY },
      },
    } as PopulatedFlow;

    const page = await triggerEventService.test({ projectId, flow });
    expect(page).toBe(emptyPage);
  });
});
