import { fileBlocksUtils } from '@openops/server-shared';
import { ActionType, Trigger, TriggerType } from '@openops/shared';
import { calculateTestRunActionLimits } from '../test-run-action-limits-calculator';

jest.mock('@openops/server-shared', () => ({
  fileBlocksUtils: {
    findAllBlocks: jest.fn(),
  },
}));

describe('calculateTestRunActionLimits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty limits for null trigger', async () => {
    const result = await calculateTestRunActionLimits(null);

    expect(result).toEqual({
      isEnabled: true,
      limits: [],
    });
  });

  it('should return limits for write actions only', async () => {
    const trigger: Trigger = {
      id: 'trigger1',
      name: 'trigger1',
      type: TriggerType.EMPTY,
      settings: {},
      valid: true,
      displayName: 'Trigger',
      nextAction: {
        id: 'step1',
        name: 'step1',
        type: ActionType.BLOCK,
        settings: {
          blockName: 'http',
          actionName: 'send_request',
        },
        valid: true,
        displayName: 'HTTP Request',
      },
    };

    (fileBlocksUtils.findAllBlocks as jest.Mock).mockResolvedValue([
      {
        name: 'http',
        actions: {
          send_request: { isWriteAction: true },
          get_request: { isWriteAction: false },
        },
      },
    ]);

    const result = await calculateTestRunActionLimits(trigger);

    expect(result).toEqual({
      isEnabled: true,
      limits: [
        {
          blockName: 'http',
          actionName: 'send_request',
          isEnabled: true,
          limit: 10,
        },
      ],
    });
  });

  it('should deduplicate same block/action pairs', async () => {
    const trigger: Trigger = {
      id: 'trigger1',
      name: 'trigger1',
      type: TriggerType.EMPTY,
      settings: {},
      valid: true,
      displayName: 'Trigger',
      nextAction: {
        id: 'step1',
        name: 'step1',
        type: ActionType.BLOCK,
        settings: {
          blockName: 'http',
          actionName: 'send_request',
        },
        valid: true,
        displayName: 'HTTP Request 1',
        nextAction: {
          id: 'step2',
          name: 'step2',
          type: ActionType.BLOCK,
          settings: {
            blockName: 'http',
            actionName: 'send_request',
          },
          valid: true,
          displayName: 'HTTP Request 2',
        },
      },
    };

    (fileBlocksUtils.findAllBlocks as jest.Mock).mockResolvedValue([
      {
        name: 'http',
        actions: {
          send_request: { isWriteAction: true },
        },
      },
    ]);

    const result = await calculateTestRunActionLimits(trigger);

    expect(result.limits).toHaveLength(1);
  });

  it('should skip non-block action types', async () => {
    const trigger: Trigger = {
      id: 'trigger1',
      name: 'trigger1',
      type: TriggerType.EMPTY,
      settings: {},
      valid: true,
      displayName: 'Trigger',
      nextAction: {
        id: 'step1',
        name: 'step1',
        type: ActionType.CODE,
        settings: {},
        valid: true,
        displayName: 'Code Step',
        nextAction: {
          id: 'step2',
          name: 'step2',
          type: ActionType.BLOCK,
          settings: {
            blockName: 'http',
            actionName: 'send_request',
          },
          valid: true,
          displayName: 'HTTP Request',
        },
      },
    };

    (fileBlocksUtils.findAllBlocks as jest.Mock).mockResolvedValue([
      {
        name: 'http',
        actions: {
          send_request: { isWriteAction: true },
        },
      },
    ]);

    const result = await calculateTestRunActionLimits(trigger);

    expect(result.limits).toHaveLength(1);
    expect(result.limits[0].blockName).toBe('http');
  });
});
