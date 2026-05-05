import { fileBlocksUtils } from '@openops/server-shared';
import {
  Action,
  ActionType,
  BlockType,
  FlowOperationType,
  PackageType,
  Trigger,
  TriggerType,
} from '@openops/shared';
import {
  calculateTestRunActionLimits,
  DEFAULT_TEST_RUN_LIMIT,
  mergeTestRunLimits,
  shouldRecalculateTestRunActionLimits,
  tryIncrementalUpdate,
} from '../../../../src/app/flows/flow-version/test-run-action-limits-calculator';

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

describe('mergeTestRunLimits', () => {
  it('should preserve master isEnabled: false from previous', () => {
    const previous = {
      isEnabled: false,
      limits: [
        {
          blockName: 'http',
          actionName: 'send_request',
          isEnabled: false,
          limit: 5,
        },
      ],
    };
    const calculated = {
      isEnabled: true,
      limits: [
        {
          blockName: 'http',
          actionName: 'send_request',
          isEnabled: true,
          limit: 10,
        },
      ],
    };

    const result = mergeTestRunLimits(previous, calculated);

    expect(result.isEnabled).toBe(false);
  });

  it('should preserve master isEnabled: true from previous', () => {
    const previous = {
      isEnabled: true,
      limits: [],
    };
    const calculated = {
      isEnabled: true,
      limits: [],
    };

    const result = mergeTestRunLimits(previous, calculated);

    expect(result.isEnabled).toBe(true);
  });

  it('should preserve individual limit isEnabled and limit values from previous', () => {
    const previous = {
      isEnabled: true,
      limits: [
        {
          blockName: 'http',
          actionName: 'send_request',
          isEnabled: false,
          limit: 5,
        },
      ],
    };
    const calculated = {
      isEnabled: true,
      limits: [
        {
          blockName: 'http',
          actionName: 'send_request',
          isEnabled: true,
          limit: 10,
        },
      ],
    };

    const result = mergeTestRunLimits(previous, calculated);

    expect(result.limits).toEqual([
      {
        blockName: 'http',
        actionName: 'send_request',
        isEnabled: false,
        limit: 5,
      },
    ]);
  });

  it('should use defaults from calculated for new limits not in previous', () => {
    const previous = {
      isEnabled: false,
      limits: [],
    };
    const calculated = {
      isEnabled: true,
      limits: [
        {
          blockName: 'slack',
          actionName: 'post_message',
          isEnabled: true,
          limit: 10,
        },
      ],
    };

    const result = mergeTestRunLimits(previous, calculated);

    expect(result.isEnabled).toBe(false);
    expect(result.limits).toEqual([
      {
        blockName: 'slack',
        actionName: 'post_message',
        isEnabled: true,
        limit: 10,
      },
    ]);
  });

  it('should drop limits from previous that are no longer in calculated', () => {
    const previous = {
      isEnabled: true,
      limits: [
        {
          blockName: 'http',
          actionName: 'send_request',
          isEnabled: false,
          limit: 3,
        },
      ],
    };
    const calculated = {
      isEnabled: true,
      limits: [],
    };

    const result = mergeTestRunLimits(previous, calculated);

    expect(result.limits).toEqual([]);
  });
});

describe('shouldRecalculateTestRunActionLimits', () => {
  it('should return true for action-affecting operations', () => {
    expect(
      shouldRecalculateTestRunActionLimits({
        type: FlowOperationType.ADD_ACTION,
        request: {},
      } as unknown as Parameters<typeof shouldRecalculateTestRunActionLimits>[0]),
    ).toBe(true);
  });

  it('should return false for other operations', () => {
    expect(
      shouldRecalculateTestRunActionLimits({
        type: FlowOperationType.CHANGE_NAME,
        request: {},
      } as unknown as Parameters<typeof shouldRecalculateTestRunActionLimits>[0]),
    ).toBe(false);
  });
});

describe('tryIncrementalUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBlockAction = (
    blockName: string,
    actionName: string,
    id = 'action1',
  ): Action => ({
    id,
    name: 'action',
    type: ActionType.BLOCK,
    settings: {
      blockName,
      actionName,
      blockVersion: '1.0.0',
      blockType: BlockType.OFFICIAL,
      packageType: PackageType.REGISTRY,
      input: {},
      inputUiInfo: {},
      errorHandlingOptions: {},
    },
    valid: true,
    displayName: 'Action',
  });

  it('should add limit for write action', async () => {
    (fileBlocksUtils.findAllBlocks as jest.Mock).mockResolvedValue([
      {
        name: 'http',
        actions: {
          send_request: { isWriteAction: true },
        },
      },
    ]);

    const currentLimits = {
      isEnabled: true,
      limits: [],
    };

    const result = await tryIncrementalUpdate(currentLimits, {
      type: FlowOperationType.ADD_ACTION,
      request: {
        action: mockBlockAction('http', 'send_request'),
        parentStep: 'trigger',
      },
    } as unknown as Parameters<typeof tryIncrementalUpdate>[1]);

    expect(result).toEqual({
      isEnabled: true,
      limits: [
        {
          blockName: 'http',
          actionName: 'send_request',
          isEnabled: true,
          limit: DEFAULT_TEST_RUN_LIMIT,
        },
      ],
    });
  });

  it('should return null for unsupported operations', async () => {
    const currentLimits = {
      isEnabled: true,
      limits: [],
    };

    const result = await tryIncrementalUpdate(currentLimits, {
      type: FlowOperationType.CHANGE_NAME,
      request: {},
    } as unknown as Parameters<typeof tryIncrementalUpdate>[1]);

    expect(result).toBeNull();
  });
});
