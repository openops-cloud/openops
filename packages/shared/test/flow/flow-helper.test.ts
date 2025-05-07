/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Action,
  ActionType,
  AppConnectionStatus,
  AppConnectionType,
  AppConnectionWithoutSensitiveData,
  ApplicationError,
  BlockAction,
  BlockType,
  BranchOperator,
  ErrorCode,
  flowHelper,
  FlowOperationRequest,
  FlowOperationType,
  FlowVersion,
  FlowVersionState,
  PackageType,
  PasteActionsRequest,
  StepLocationRelativeToParent,
  Trigger,
  TriggerType,
} from '../../src';

const flowVersionWithBranching: FlowVersion = {
  id: 'pj0KQ7Aypoa9OQGHzmKDl',
  created: '2023-05-24T00:16:41.353Z',
  updated: '2023-05-24T00:16:41.353Z',
  flowId: 'lod6JEdKyPlvrnErdnrGa',
  updatedBy: '',
  displayName: 'Standup Reminder',
  trigger: {
    name: 'trigger',
    type: TriggerType.BLOCK,
    valid: true,
    settings: {
      input: {
        cronExpression: '25 10 * * 0,1,2,3,4',
      },
      packageType: PackageType.REGISTRY,
      blockType: BlockType.OFFICIAL,
      blockName: 'schedule',
      blockVersion: '0.0.2',
      inputUiInfo: {},
      triggerName: 'cron_expression',
    },
    nextAction: {
      name: 'step_1',
      type: 'BRANCH',
      valid: true,
      settings: {
        conditions: [
          [
            {
              operator: 'TEXT_CONTAINS',
              firstValue: '1',
              secondValue: '1',
              caseSensitive: true,
            },
          ],
        ],
      },
      nextAction: {
        id: 'step_4',
        name: 'step_4',
        type: 'BLOCK',
        valid: true,
        settings: {
          input: {
            key: '1',
          },
          packageType: PackageType.REGISTRY,
          blockType: BlockType.OFFICIAL,
          blockName: 'store',
          blockVersion: '0.2.6',
          actionName: 'get',
          inputUiInfo: {
            customizedInputs: {},
          },
        },
        displayName: 'Get',
      },
      displayName: 'Branch',
      onFailureAction: {
        name: 'step_3',
        type: 'CODE',
        valid: true,
        settings: {
          input: {},
          sourceCode: {
            code: 'test',
            packageJson: '{}',
          },
        },
        displayName: 'Code',
      },
      onSuccessAction: {
        name: 'step_2',
        type: 'BLOCK',
        valid: true,
        settings: {
          input: {
            content: 'MESSAGE',
            webhook_url: 'WEBHOOK_URL',
          },
          packageType: PackageType.REGISTRY,
          blockType: BlockType.OFFICIAL,
          blockName: 'discord',
          blockVersion: '0.2.1',
          actionName: 'send_message_webhook',
          inputUiInfo: {
            customizedInputs: {},
          },
        },
        displayName: 'Send Message Webhook',
      },
    },
    displayName: 'Cron Expression',
  },
  valid: true,
  state: FlowVersionState.DRAFT,
};

function createCodeAction(name: string): Action {
  return {
    id: name,
    name,
    displayName: 'Code',
    type: ActionType.CODE,
    valid: true,
    settings: {
      sourceCode: {
        code: 'test',
        packageJson: '{}',
      },
      input: {},
    },
  };
}

function createBlockAction(
  name: string,
  displayName: string,
  settings: {
    input: Record<string, unknown>;
    packageType: PackageType;
    blockType: BlockType;
    blockName: string;
    blockVersion: string;
    actionName: string;
    inputUiInfo: {
      customizedInputs?: Record<string, unknown>;
    };
    errorHandlingOptions?: {
      retryOnFailure: {
        value: boolean;
      };
      continueOnFailure: {
        value: boolean;
      };
    };
  },
): Action {
  return {
    id: name,
    name,
    displayName,
    type: ActionType.BLOCK,
    valid: true,
    settings,
  };
}

function createBranchAction(
  name: string,
  settings: {
    conditions: Array<
      Array<{
        operator: BranchOperator;
        firstValue: string;
        secondValue: string;
        caseSensitive: boolean;
      }>
    >;
    inputUiInfo: {
      customizedInputs?: Record<string, unknown>;
    };
  },
): Action {
  return {
    id: name,
    name,
    displayName: 'Branch',
    type: ActionType.BRANCH,
    valid: true,
    settings,
  };
}

function createLoopAction(
  name: string,
  settings: {
    items: string;
    inputUiInfo: {
      customizedInputs?: Record<string, unknown>;
    };
  },
): Action {
  return {
    id: name,
    name,
    displayName: 'Loop',
    type: ActionType.LOOP_ON_ITEMS,
    valid: true,
    settings,
  };
}

const emptyScheduleFlowVersion: FlowVersion = {
  id: 'pj0KQ7Aypoa9OQGHzmKDl',
  created: '2023-05-24T00:16:41.353Z',
  updated: '2023-05-24T00:16:41.353Z',
  flowId: 'lod6JEdKyPlvrnErdnrGa',
  displayName: 'Standup Reminder',
  updatedBy: '',
  trigger: {
    name: 'trigger',
    type: TriggerType.BLOCK,
    valid: true,
    settings: {
      input: {
        cronExpression: '25 10 * * 0,1,2,3,4',
      },
      packageType: PackageType.REGISTRY,
      blockType: BlockType.OFFICIAL,
      blockName: 'schedule',
      blockVersion: '0.0.2',
      inputUiInfo: {},
      triggerName: 'cron_expression',
    },
    displayName: 'Cron Expression',
  },
  valid: true,
  state: FlowVersionState.DRAFT,
};

describe('Flow Helper', () => {
  it('should lock a flow', () => {
    const operation: FlowOperationRequest = {
      type: FlowOperationType.LOCK_FLOW,
      request: {
        flowId: flowVersionWithBranching.flowId,
      },
    };
    const result = flowHelper.apply(flowVersionWithBranching, operation);
    expect(result.state).toEqual(FlowVersionState.LOCKED);
  });

  it('should delete branch', () => {
    const operation: FlowOperationRequest = {
      type: FlowOperationType.DELETE_ACTION,
      request: {
        name: flowVersionWithBranching.trigger.nextAction.name,
      },
    };
    const result = flowHelper.apply(flowVersionWithBranching, operation);
    const expectedFlowVersion: FlowVersion = {
      id: 'pj0KQ7Aypoa9OQGHzmKDl',
      updatedBy: '',
      created: '2023-05-24T00:16:41.353Z',
      updated: '2023-05-24T00:16:41.353Z',
      flowId: 'lod6JEdKyPlvrnErdnrGa',
      displayName: 'Standup Reminder',
      trigger: {
        name: 'trigger',
        type: TriggerType.BLOCK,
        valid: true,
        settings: {
          input: {
            cronExpression: '25 10 * * 0,1,2,3,4',
          },
          packageType: PackageType.REGISTRY,
          blockType: BlockType.OFFICIAL,
          blockName: 'schedule',
          blockVersion: '0.0.2',
          inputUiInfo: {},
          triggerName: 'cron_expression',
        },
        displayName: 'Cron Expression',
        nextAction: {
          id: 'step_4',
          name: 'step_4',
          type: 'BLOCK',
          valid: true,
          settings: {
            input: {
              key: '1',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'store',
            blockVersion: '0.2.6',
            actionName: 'get',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          displayName: 'Get',
        },
      },
      valid: true,
      state: FlowVersionState.DRAFT,
    };
    expect(result).toEqual(expectedFlowVersion);
  });

  it('should update branch', () => {
    const updateRequest: FlowOperationRequest = {
      type: FlowOperationType.UPDATE_ACTION,
      request: {
        name: 'step_1',
        type: ActionType.BRANCH,
        displayName: 'Branch',
        valid: true,
        settings: {
          conditions: [
            [
              {
                operator: BranchOperator.TEXT_CONTAINS,
                firstValue: '1',
                secondValue: '1',
                caseSensitive: true,
              },
            ],
          ],
          inputUiInfo: {},
        },
      },
    };
    const updateFlowVersion = flowHelper.apply(
      flowVersionWithBranching,
      updateRequest,
    );
    const expectedFlowTrigger: Trigger = {
      name: 'trigger',
      type: TriggerType.BLOCK,
      valid: true,
      settings: {
        input: {
          cronExpression: '25 10 * * 0,1,2,3,4',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'schedule',
        blockVersion: '0.0.2',
        inputUiInfo: {},
        triggerName: 'cron_expression',
      },
      nextAction: {
        displayName: 'Branch',
        name: 'step_1',
        valid: true,
        nextAction: {
          id: 'step_4',
          name: 'step_4',
          type: 'BLOCK',
          valid: true,
          settings: {
            input: {
              key: '1',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'store',
            blockVersion: '0.2.6',
            actionName: 'get',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          displayName: 'Get',
        },
        onFailureAction: {
          name: 'step_3',
          type: 'CODE',
          valid: true,
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
          displayName: 'Code',
        },
        onSuccessAction: {
          name: 'step_2',
          type: 'BLOCK',
          valid: true,
          settings: {
            input: {
              content: 'MESSAGE',
              webhook_url: 'WEBHOOK_URL',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'discord',
            blockVersion: '0.2.1',
            actionName: 'send_message_webhook',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          displayName: 'Send Message Webhook',
        },
        type: 'BRANCH',
        settings: {
          conditions: [
            [
              {
                operator: 'TEXT_CONTAINS',
                firstValue: '1',
                secondValue: '1',
                caseSensitive: true,
              },
            ],
          ],
          inputUiInfo: {},
        },
      },
      displayName: 'Cron Expression',
    };
    expect(updateFlowVersion.trigger).toEqual(expectedFlowTrigger);
  });

  it('should add branch step with actions', () => {
    const addBranchRequest: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'trigger',
        action: createBranchAction('step_1', {
          conditions: [
            [
              {
                operator: BranchOperator.TEXT_CONTAINS,
                firstValue: '1',
                secondValue: '1',
                caseSensitive: true,
              },
            ],
          ],
          inputUiInfo: {},
        }),
      },
    };
    const addCodeActionOnTrue: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent:
          StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
        action: createCodeAction('step_2'),
      },
    };
    const addCodeActionOnFalse: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent:
          StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
        action: createCodeAction('step_3'),
      },
    };
    const addCodeActionOnAfter: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent: StepLocationRelativeToParent.AFTER,
        action: createCodeAction('step_4'),
      },
    };
    let resultFlow = emptyScheduleFlowVersion;
    resultFlow = flowHelper.apply(resultFlow, addBranchRequest);
    resultFlow = flowHelper.apply(resultFlow, addCodeActionOnTrue);
    resultFlow = flowHelper.apply(resultFlow, addCodeActionOnFalse);
    resultFlow = flowHelper.apply(resultFlow, addCodeActionOnAfter);
    const expectedTrigger: Trigger = {
      name: 'trigger',
      type: TriggerType.BLOCK,
      valid: true,
      settings: {
        input: {
          cronExpression: '25 10 * * 0,1,2,3,4',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'schedule',
        blockVersion: '0.0.2',
        inputUiInfo: {},
        triggerName: 'cron_expression',
      },
      displayName: 'Cron Expression',
      nextAction: {
        id: 'step_1',
        displayName: 'Branch',
        name: 'step_1',
        valid: true,
        type: 'BRANCH',
        settings: {
          conditions: [
            [
              {
                operator: 'TEXT_CONTAINS',
                firstValue: '1',
                secondValue: '1',
                caseSensitive: true,
              },
            ],
          ],
          inputUiInfo: {},
        },
        onSuccessAction: {
          displayName: 'Code',
          name: 'step_2',
          id: 'step_2',
          valid: true,
          type: 'CODE',
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
        },
        onFailureAction: {
          displayName: 'Code',
          name: 'step_3',
          id: 'step_3',
          valid: true,
          type: 'CODE',
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
        },
        nextAction: {
          displayName: 'Code',
          name: 'step_4',
          id: 'step_4',
          valid: true,
          type: 'CODE',
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
        },
      },
    };
    expect(resultFlow.trigger).toEqual(expectedTrigger);
  });

  it('should add loop step with actions', () => {
    const addBranchRequest: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'trigger',
        action: createLoopAction('step_1', {
          items: 'items',
          inputUiInfo: {},
        }),
      },
    };
    const addCodeActionInside: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent: StepLocationRelativeToParent.INSIDE_LOOP,
        action: createCodeAction('step_3'),
      },
    };
    const addCodeActionOnAfter: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent: StepLocationRelativeToParent.AFTER,
        action: createCodeAction('step_4'),
      },
    };
    let resultFlow = emptyScheduleFlowVersion;
    resultFlow = flowHelper.apply(resultFlow, addBranchRequest);
    resultFlow = flowHelper.apply(resultFlow, addCodeActionInside);
    resultFlow = flowHelper.apply(resultFlow, addCodeActionOnAfter);

    const expectedTrigger: Trigger = {
      name: 'trigger',
      type: TriggerType.BLOCK,
      valid: true,
      settings: {
        input: {
          cronExpression: '25 10 * * 0,1,2,3,4',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'schedule',
        blockVersion: '0.0.2',
        inputUiInfo: {},
        triggerName: 'cron_expression',
      },
      displayName: 'Cron Expression',
      nextAction: {
        id: 'step_1',
        displayName: 'Loop',
        name: 'step_1',
        valid: true,
        type: 'LOOP_ON_ITEMS',
        settings: {
          items: 'items',
          inputUiInfo: {},
        },
        firstLoopAction: {
          displayName: 'Code',
          id: 'step_3',
          name: 'step_3',
          valid: true,
          type: 'CODE',
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
        },
        nextAction: {
          displayName: 'Code',
          id: 'step_4',
          name: 'step_4',
          valid: true,
          type: 'CODE',
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
        },
      },
    };
    expect(resultFlow.trigger).toEqual(expectedTrigger);
  });

  it('should block adding step if it already exists in the flow', () => {
    const flowVersion: FlowVersion = {
      id: 'pj0KQ7Aypoa9OQGHzmKDl',
      updatedBy: '',
      created: '2023-05-24T00:16:41.353Z',
      updated: '2023-05-24T00:16:41.353Z',
      flowId: 'lod6JEdKyPlvrnErdnrGa',
      displayName: 'Standup Reminder',
      trigger: {
        name: 'trigger',
        type: TriggerType.BLOCK,
        valid: true,
        settings: {
          input: {
            cronExpression: '25 10 * * 0,1,2,3,4',
          },
          packageType: PackageType.REGISTRY,
          blockType: BlockType.OFFICIAL,
          blockName: 'schedule',
          blockVersion: '0.0.2',
          inputUiInfo: {},
          triggerName: 'cron_expression',
        },
        displayName: 'Cron Expression',
        nextAction: {
          name: 'step_1',
          type: 'BLOCK',
          valid: true,
          settings: {
            input: {
              key: '1',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'store',
            blockVersion: '0.2.6',
            actionName: 'get',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          displayName: 'Get',
        },
      },
      valid: true,
      state: FlowVersionState.DRAFT,
    };
    const operation: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'trigger',
        action: {
          name: 'step_1',
          type: ActionType.BLOCK,
          displayName: 'Get',
          settings: {
            input: {
              key: '2',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'store',
            blockVersion: '0.2.6',
            actionName: 'get',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          valid: true,
        },
      },
    };

    expect(() => flowHelper.apply(flowVersion, operation)).toThrow(
      new ApplicationError(
        {
          code: ErrorCode.FLOW_OPERATION_INVALID,
          params: {},
        },
        'Step step_1 already exists',
      ),
    );
  });

  it('should handle paste actions request', () => {
    const pasteActionsRequest: PasteActionsRequest = {
      parentStep: 'trigger',
      stepLocationRelativeToParent: StepLocationRelativeToParent.AFTER,
      action: createBlockAction('step_1', 'Get', {
        input: {
          key: '1',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'store',
        blockVersion: '~0.2.6',
        actionName: 'get',
        inputUiInfo: {
          customizedInputs: {},
        },
      }),
    };

    const operation: FlowOperationRequest = {
      type: FlowOperationType.PASTE_ACTIONS,
      request: pasteActionsRequest,
    };

    const result = flowHelper.apply(emptyScheduleFlowVersion, operation);
    const { id, ...actionWithoutId } = pasteActionsRequest.action;
    const { id: resultId, ...resultWithoutId } = result.trigger.nextAction;
    expect(resultWithoutId).toEqual(actionWithoutId);
    expect(typeof resultId).toBe('string');
  });

  it('should handle update action with nested steps', () => {
    const updateRequest: FlowOperationRequest = {
      type: FlowOperationType.UPDATE_ACTION,
      request: {
        name: 'step_1',
        type: ActionType.BRANCH,
        displayName: 'Branch',
        valid: true,
        settings: {
          conditions: [
            [
              {
                operator: BranchOperator.TEXT_CONTAINS,
                firstValue: '1',
                secondValue: '1',
                caseSensitive: true,
              },
            ],
          ],
          inputUiInfo: {},
        },
      },
    };

    const result = flowHelper.apply(flowVersionWithBranching, updateRequest);
    expect(result.trigger.nextAction).toBeDefined();
    expect(result.trigger.nextAction?.type).toBe(ActionType.BRANCH);
  });

  it('should handle delete action with nested steps', () => {
    const operation: FlowOperationRequest = {
      type: FlowOperationType.DELETE_ACTION,
      request: {
        name: 'step_2',
      },
    };

    const result = flowHelper.apply(flowVersionWithBranching, operation);
    expect(result.trigger.nextAction?.onSuccessAction).toBeUndefined();
  });
});

it('Duplicate Flow With Branch', () => {
  const flowVersion: FlowVersion = {
    id: 'pj0KQ7Aypoa9OQGHzmKDl',
    created: '2023-05-24T00:16:41.353Z',
    updated: '2023-05-24T00:16:41.353Z',
    flowId: 'lod6JEdKyPlvrnErdnrGa',
    updatedBy: '',
    displayName: 'Standup Reminder',
    trigger: {
      name: 'trigger',
      type: TriggerType.BLOCK,
      valid: true,
      settings: {
        input: {
          cronExpression: '25 10 * * 0,1,2,3,4',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'schedule',
        blockVersion: '0.0.2',
        inputUiInfo: {},
        triggerName: 'cron_expression',
      },
      nextAction: {
        name: 'step_1',
        type: 'BRANCH',
        valid: true,
        settings: {
          conditions: [
            [
              {
                operator: 'TEXT_CONTAINS',
                firstValue: '1',
                secondValue: '1',
                caseSensitive: true,
              },
            ],
          ],
          inputUiInfo: {},
        },
        nextAction: {
          name: 'step_4',
          type: 'BLOCK',
          valid: true,
          settings: {
            input: {
              key: '1',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'store',
            blockVersion: '0.2.6',
            actionName: 'get',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          displayName: 'Get',
        },
        displayName: 'Branch',
        onFailureAction: {
          name: 'step_3',
          type: 'CODE',
          id: 'step_3',
          valid: true,
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
          displayName: 'Code',
        },
        onSuccessAction: {
          name: 'step_2',
          type: 'BLOCK',
          valid: true,
          settings: {
            input: {
              content: 'MESSAGE',
              webhook_url: 'WEBHOOK_URL',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'discord',
            blockVersion: '0.2.1',
            actionName: 'send_message_webhook',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          displayName: 'Send Message Webhook',
        },
      },
      displayName: 'Cron Expression',
    },
    valid: true,
    state: FlowVersionState.DRAFT,
  };
  const expectedImportOperations: FlowOperationRequest[] = [
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'trigger',
        action: {
          type: ActionType.BRANCH,
          name: 'step_1',
          displayName: 'Branch',
          id: 'IPvDstQewUpNmrQtADqJw',
          settings: {
            conditions: [
              [
                {
                  operator: BranchOperator.TEXT_CONTAINS,
                  firstValue: '1',
                  secondValue: '1',
                  caseSensitive: true,
                },
              ],
            ],
            inputUiInfo: {},
          },
          valid: true,
        },
      },
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        action: {
          type: ActionType.BLOCK,
          name: 'step_4',
          displayName: 'Get',
          id: 'T7WQtMmqk5paJHq1HnE2m',
          settings: {
            input: {
              key: '1',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'store',
            blockVersion: '0.2.6',
            actionName: 'get',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          valid: true,
        },
      },
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent:
          StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
        action: {
          type: ActionType.CODE,
          name: 'step_3',
          displayName: 'Code',
          id: 'step_3',
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
          valid: true,
        },
      },
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent:
          StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
        action: {
          type: ActionType.BLOCK,
          name: 'step_2',
          displayName: 'Send Message Webhook',
          settings: {
            input: {
              content: 'MESSAGE',
              webhook_url: 'WEBHOOK_URL',
            },
            packageType: PackageType.REGISTRY,
            blockType: BlockType.OFFICIAL,
            blockName: 'discord',
            blockVersion: '0.2.1',
            actionName: 'send_message_webhook',
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          valid: true,
        },
      },
    },
  ];
  const importOperations = flowHelper.getImportOperations(flowVersion.trigger);

  // Verify structure without specific IDs
  expect(importOperations).toHaveLength(expectedImportOperations.length);
  importOperations.forEach((operation, index) => {
    const expectedOperation = expectedImportOperations[index];
    expect(operation.type).toBe(expectedOperation.type);

    const request = operation.request as { parentStep: string; action: Action };
    const expectedRequest = expectedOperation.request as {
      parentStep: string;
      action: Action;
    };

    expect(request.parentStep).toBe(expectedRequest.parentStep);
    const { id, ...actionWithoutId } = request.action;
    const { id: expectedId, ...expectedActionWithoutId } =
      expectedRequest.action;
    expect(actionWithoutId).toEqual(expectedActionWithoutId);
    expect(typeof id).toBe('string');
  });
});
it('Duplicate Flow With Loops using Import', () => {
  const flowVersion: FlowVersion = {
    id: '2XuLcKZWSgKkiHh6RqWXg',
    created: '2023-05-23T00:14:47.809Z',
    updated: '2023-05-23T00:14:47.809Z',
    flowId: 'YGPIPQDfLcPdJ0aJ9AKGb',
    updatedBy: '',
    displayName: 'Flow 1',
    trigger: {
      name: 'trigger',
      type: TriggerType.BLOCK,
      valid: true,
      settings: {
        input: {
          repository: {
            repo: 'openops',
            owner: 'openops',
          },
          authentication: '{{connections.github}}',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'github',
        blockVersion: '0.1.3',
        inputUiInfo: {},
        triggerName: 'trigger_star',
      },
      nextAction: {
        name: 'step_1',
        type: 'LOOP_ON_ITEMS',
        valid: false,
        settings: {
          items: '',
          inputUiInfo: {},
        },
        nextAction: {
          name: 'step_3',
          type: 'CODE',
          id: 'step_3',
          valid: true,
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
          displayName: 'Code',
        },
        displayName: 'Loop on Items',
        firstLoopAction: {
          name: 'step_2',
          type: 'CODE',
          id: 'step_2',
          valid: true,
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
          displayName: 'Code',
        },
      },
      displayName: 'Trigger',
    },
    valid: false,
    state: FlowVersionState.DRAFT,
  };
  const expectedResult: FlowOperationRequest[] = [
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'trigger',
        action: {
          name: 'step_1',
          type: ActionType.LOOP_ON_ITEMS,
          valid: false,
          settings: {
            items: '',
            inputUiInfo: {},
          },
          displayName: 'Loop on Items',
        },
      },
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        action: {
          name: 'step_3',
          type: ActionType.CODE,
          valid: true,
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
          displayName: 'Code',
          id: 'step_3',
        },
      },
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent: StepLocationRelativeToParent.INSIDE_LOOP,
        action: {
          name: 'step_2',
          type: ActionType.CODE,
          valid: true,
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
          displayName: 'Code',
          id: 'step_2',
        },
      },
    },
  ];

  const importOperations = flowHelper.getImportOperations(flowVersion.trigger);

  // Verify structure without specific IDs
  expect(importOperations).toHaveLength(expectedResult.length);
  importOperations.forEach((operation, index) => {
    const expectedOperation = expectedResult[index];
    expect(operation.type).toBe(expectedOperation.type);

    const request = operation.request as { parentStep: string; action: Action };
    const expectedRequest = expectedOperation.request as {
      parentStep: string;
      action: Action;
    };

    expect(request.parentStep).toBe(expectedRequest.parentStep);
    const { id, ...actionWithoutId } = request.action;
    const { id: expectedId, ...expectedActionWithoutId } =
      expectedRequest.action;
    expect(actionWithoutId).toEqual(expectedActionWithoutId);
    expect(typeof id).toBe('string');
  });
});

it('Should remove connections', () => {
  const mockFlowVersionWithConnections = {
    id: '8I6NWtfL5HxpRW3dShyTW',
    created: '2025-02-13T09:31:28.570Z',
    updated: '2025-02-13T09:33:10.552Z',
    flowId: 'CObU2KHVPozC24dbvtRUY',
    description: '',
    displayName: 'Untitled',
    trigger: {
      name: 'trigger',
      type: 'TRIGGER',
      valid: true,
      settings: {
        input: {
          timezone: 'UTC',
          day_of_the_week: 3,
          hour_of_the_day: 1,
        },
        blockName: '@openops/block-schedule',
        blockType: 'OFFICIAL',
        inputUiInfo: {
          customizedInputs: {},
        },
        packageType: 'REGISTRY',
        triggerName: 'every_week',
        blockVersion: '~0.1.5',
      },
      nextAction: {
        name: 'step_1',
        type: 'BRANCH',
        valid: true,
        settings: {
          conditions: [
            [
              {
                operator: 'TEXT_CONTAINS',
                firstValue: '1',
                secondValue: '2',
                caseSensitive: false,
              },
            ],
          ],
          inputUiInfo: {},
        },
        displayName: 'Condition',
        onFailureAction: {
          name: 'step_2',
          type: 'BLOCK',
          valid: true,
          settings: {
            input: {
              auth: "{{connections['mock-aws-connection']}}",
              tags: [],
              dryRun: false,
              accounts: {},
              condition: 'AND',
              volumeTypes: null,
              filterByARNs: false,
              filterProperty: {
                regions: ['us-east-2'],
              },
              shouldQueryOnlyUnattached: false,
            },
            blockName: '@openops/block-aws',
            blockType: 'OFFICIAL',
            actionName: 'ebs_get_volumes',
            inputUiInfo: {
              customizedInputs: {},
            },
            packageType: 'REGISTRY',
            blockVersion: '~0.0.3',
            errorHandlingOptions: {
              retryOnFailure: {
                value: false,
              },
              continueOnFailure: {
                value: false,
              },
            },
          },
          nextAction: {
            name: 'step_3',
            type: 'LOOP_ON_ITEMS',
            valid: false,
            settings: {
              items: '',
              inputUiInfo: {
                customizedInputs: {},
              },
            },
            displayName: 'Loop on Items',
            firstLoopAction: {
              name: 'step_4',
              type: 'BLOCK',
              valid: true,
              settings: {
                input: {
                  auth: "{{connections['mock-slack-connection']}}",
                  file: null,
                  text: {
                    text: 'test message',
                  },
                  blocks: {},
                  threadTs: null,
                  username: null,
                  headerText: {
                    headerText: null,
                  },
                  conversationId: 'xyz',
                  authorizedUsers: null,
                  blockKitEnabled: false,
                },
                blockName: '@openops/block-slack',
                blockType: 'OFFICIAL',
                actionName: 'send_slack_message',
                inputUiInfo: {
                  customizedInputs: {},
                },
                packageType: 'REGISTRY',
                blockVersion: '~0.5.2',
                errorHandlingOptions: {
                  retryOnFailure: {
                    value: false,
                  },
                  continueOnFailure: {
                    value: false,
                  },
                },
              },
              displayName: 'Send Message',
            },
          },
          displayName: 'EBS Get Volumes',
        },
      },
      displayName: 'Every Week',
    },
    updatedBy: 'miQ8EedddCkJeZGIC5ODk',
    valid: false,
    state: 'DRAFT',
  } as FlowVersion;
  const result = flowHelper.apply(mockFlowVersionWithConnections, {
    type: FlowOperationType.REMOVE_CONNECTIONS,
    request: null,
  });
  const steps = flowHelper.getAllSteps(result.trigger);

  for (const step of steps.filter((s) => s.type !== 'TRIGGER')) {
    if (step.settings.input) {
      expect(step.settings.input.auth).toEqual('');
    }
  }
});

describe('getImportOperations', () => {
  const mockAction = createBlockAction('step_1', 'Get', {
    input: {
      key: '1',
    },
    packageType: PackageType.REGISTRY,
    blockType: BlockType.OFFICIAL,
    blockName: 'store',
    blockVersion: '0.2.6',
    actionName: 'get',
    inputUiInfo: {
      customizedInputs: {},
    },
  });

  const mockTrigger: Trigger = {
    name: 'trigger',
    type: TriggerType.BLOCK,
    valid: true,
    settings: {
      input: {
        cronExpression: '25 10 * * 0,1,2,3,4',
      },
      packageType: PackageType.REGISTRY,
      blockType: BlockType.OFFICIAL,
      blockName: 'schedule',
      blockVersion: '0.0.2',
      inputUiInfo: {},
      triggerName: 'cron_expression',
    },
    displayName: 'Cron Expression',
    nextAction: mockAction,
  };

  const mockSlackAction = createBlockAction('step_1', 'Send Message', {
    input: {
      auth: "{{connections['initial-slack-connection']}}",
      file: null,
      text: {},
      blocks: {},
      threadTs: null,
      username: null,
      headerText: {},
      conversationId: null,
      authorizedUsers: null,
      blockKitEnabled: false,
    },
    blockName: '@openops/block-slack',
    packageType: PackageType.REGISTRY,
    actionName: 'send_slack_message',
    blockType: BlockType.OFFICIAL,
    inputUiInfo: {
      customizedInputs: {},
    },
    blockVersion: '~0.5.2',
    errorHandlingOptions: {
      retryOnFailure: {
        value: false,
      },
      continueOnFailure: {
        value: false,
      },
    },
  });

  const mockConnection = {
    id: 'T0N9yCE9dwpjcHvTH5hkQ',
    created: '2025-02-03T14:43:12.324Z',
    updated: '2025-02-03T14:43:12.324Z',
    name: 'prefilled-slack-connection',
    type: AppConnectionType.CLOUD_OAUTH2,
    blockName: '@openops/block-slack',
    projectId: 'RBzywn95MW70WsnpKFQRU',
    status: AppConnectionStatus.ACTIVE,
  } as AppConnectionWithoutSensitiveData;

  type OperationsResponse = Array<{
    type: 'ADD_ACTION';
    request: {
      parentStep: string;
      action: BlockAction;
    };
  }>;

  it('should return empty array for undefined step', () => {
    expect(flowHelper.getImportOperations(undefined)).toEqual([]);
  });

  it('should return no operations for trigger with no next action', () => {
    const result = flowHelper.getImportOperations(
      {
        ...mockTrigger,
        nextAction: undefined,
      },
      [],
    );

    expect(result).toEqual([]);
  });

  it('should return operations for trigger with one next action', () => {
    const result = flowHelper.getImportOperations(mockTrigger, []);

    expect(result).toHaveLength(1);
    const operation = result[0];
    expect(operation.type).toBe('ADD_ACTION');

    const request = operation.request as { parentStep: string; action: Action };
    expect(request.parentStep).toBe('trigger');

    const { id, ...actionWithoutId } = request.action;
    expect(actionWithoutId).toEqual({
      displayName: 'Get',
      name: 'step_1',
      settings: {
        actionName: 'get',
        blockName: 'store',
        blockType: 'OFFICIAL',
        blockVersion: '0.2.6',
        input: {
          auth: undefined,
          key: '1',
        },
        inputUiInfo: {
          customizedInputs: {},
        },
        packageType: 'REGISTRY',
      },
      type: 'BLOCK',
      valid: true,
    });
    expect(typeof id).toBe('string');
  });

  it('should return prefilled action with connection', () => {
    const result = flowHelper.getImportOperations(
      {
        ...mockTrigger,
        nextAction: mockSlackAction,
      },
      [mockConnection],
    ) as OperationsResponse;

    expect(result[0].request.action.settings.input['auth']).toEqual(
      "{{connections['prefilled-slack-connection']}}",
    );
  });

  it('should return prefilled connections for actions inside branch / split / loop', () => {
    const mockActionWithNestedSteps = {
      name: 'step_6',
      type: ActionType.SPLIT,
      valid: true,
      branches: [
        {
          optionId: 'diWZ8zzutSlNU1xQBNQ75',
        },
        {
          optionId: 'fA5_aFv6-6CAjno60YBsz',
          nextAction: {
            name: 'step_1',
            type: ActionType.BRANCH,
            valid: false,
            settings: {
              conditions: [[]],
              inputUiInfo: {},
            },
            displayName: 'Condition',
            onSuccessAction: {
              name: 'step_2',
              type: ActionType.LOOP_ON_ITEMS,
              valid: false,
              settings: {
                items: '',
                inputUiInfo: {
                  customizedInputs: {},
                },
              },
              displayName: 'Loop on Items',
              firstLoopAction: {
                name: 'step_3',
                type: ActionType.BLOCK,
                valid: false,
                settings: {
                  input: {
                    auth: "{{connections['slack']}}",
                    file: null,
                    text: {
                      text: null,
                    },
                    blocks: {},
                    threadTs: null,
                    username: null,
                    headerText: {
                      headerText: null,
                    },
                    conversationId: null,
                    authorizedUsers: null,
                    blockKitEnabled: false,
                  },
                  blockName: '@openops/block-slack',
                  blockType: BlockType.OFFICIAL,
                  actionName: 'send_slack_message',
                  inputUiInfo: {
                    customizedInputs: {},
                  },
                  packageType: PackageType.REGISTRY,
                  blockVersion: '~0.5.2',
                  errorHandlingOptions: {
                    retryOnFailure: {
                      value: false,
                    },
                    continueOnFailure: {
                      value: false,
                    },
                  },
                },
                displayName: 'Send Message',
              },
            },
          },
        },
      ],
      settings: {
        options: [
          {
            id: 'diWZ8zzutSlNU1xQBNQ75',
            name: 'Other',
            conditions: [[]],
          },
          {
            id: 'fA5_aFv6-6CAjno60YBsz',
            name: 'Action taken',
            conditions: [
              [
                {
                  operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                  firstValue: '',
                  secondValue: '',
                  caseSensitive: false,
                },
              ],
            ],
          },
        ],
        inputUiInfo: {},
        defaultBranch: 'diWZ8zzutSlNU1xQBNQ75',
      },
      displayName: 'test split',
    };
    const result = flowHelper.getImportOperations(
      {
        ...mockTrigger,
        nextAction: mockActionWithNestedSteps,
      },
      [mockConnection],
    ) as OperationsResponse;

    expect(result[3].request.action.settings.input['auth']).toEqual(
      "{{connections['prefilled-slack-connection']}}",
    );
  });

  it('should unset connection when block name does not match and connections are provided', () => {
    const actionWithoutBlockName = {
      ...mockSlackAction,
      settings: { ...mockSlackAction.settings, blockName: 'something-else' },
    };

    const result = flowHelper.getImportOperations(
      {
        ...mockTrigger,
        nextAction: actionWithoutBlockName,
      },
      [mockConnection],
    ) as OperationsResponse;

    expect(result[0].request.action.settings.input['auth']).toBe(undefined);
  });

  it('should not change connection when connections are not provided', () => {
    const actionWithoutBlockName = {
      ...mockSlackAction,
      settings: { ...mockSlackAction.settings, blockName: 'something-else' },
    };

    const result = flowHelper.getImportOperations({
      ...mockTrigger,
      nextAction: actionWithoutBlockName,
    }) as OperationsResponse;

    expect(result[0].request.action.settings.input['auth']).toBe(
      "{{connections['initial-slack-connection']}}",
    );
  });

  it('when having handle multiple connections for same block, the first is used', () => {
    const secondConnection = {
      ...mockConnection,
      name: 'prefilled-slack-second-connection',
      id: 'different-id',
    };

    const result = flowHelper.getImportOperations(
      {
        ...mockTrigger,
        nextAction: mockSlackAction,
      },
      [mockConnection, secondConnection],
    ) as OperationsResponse;

    expect(result[0].request.action.settings.input['auth']).toEqual(
      "{{connections['prefilled-slack-connection']}}",
    );
  });
});

describe('Split', () => {
  const flowVersionWithSplit: FlowVersion = {
    id: '2XuLcKZWSgKkiHh6RqWXg',
    created: '2023-05-23T00:14:47.809Z',
    updated: '2023-05-23T00:14:47.809Z',
    flowId: 'YGPIPQDfLcPdJ0aJ9AKGb',
    updatedBy: '',
    displayName: 'Flow 1',
    trigger: {
      name: 'trigger',
      type: TriggerType.EMPTY,
      valid: false,
      settings: {},
      nextAction: {
        name: 'step_1',
        type: 'SPLIT',
        valid: true,
        settings: {
          options: [
            {
              id: 'jFCJvPAjs8umZSeTDC5n1',
              name: 'Branch 1',
              conditions: [
                [
                  {
                    operator: 'TEXT_EXACTLY_MATCHES',
                    firstValue: '',
                    secondValue: '',
                    caseSensitive: false,
                  },
                ],
              ],
            },
            {
              id: 'uN9KHAKr7bDl_6Ffomn-u',
              name: 'Branch 2',
              conditions: [
                [
                  {
                    operator: 'TEXT_EXACTLY_MATCHES',
                    firstValue: '',
                    secondValue: '',
                    caseSensitive: false,
                  },
                ],
              ],
            },
          ],
          inputUiInfo: {
            customizedInputs: {},
          },
          defaultBranch: '',
        },
        branches: [],
        displayName: 'Split',
      },
      displayName: 'Select Trigger',
    },
    valid: true,
    state: FlowVersionState.DRAFT,
  };

  it('Should delete a split node', () => {
    const operation: FlowOperationRequest = {
      type: FlowOperationType.DELETE_ACTION,
      request: {
        name: flowVersionWithSplit.trigger.nextAction.name,
      },
    };

    const result = flowHelper.apply(flowVersionWithSplit, operation);
    const expectedFlowVersion: FlowVersion = {
      id: '2XuLcKZWSgKkiHh6RqWXg',
      created: '2023-05-23T00:14:47.809Z',
      updated: '2023-05-23T00:14:47.809Z',
      flowId: 'YGPIPQDfLcPdJ0aJ9AKGb',
      updatedBy: '',
      displayName: 'Flow 1',
      trigger: {
        name: 'trigger',
        type: TriggerType.EMPTY,
        valid: false,
        settings: {},
        displayName: 'Select Trigger',
      },
      valid: false,
      state: FlowVersionState.DRAFT,
    };
    expect(result).toEqual(expectedFlowVersion);
  });

  it('Should update a split node', () => {
    const operation: FlowOperationRequest = {
      type: FlowOperationType.UPDATE_ACTION,
      request: {
        name: flowVersionWithSplit.trigger.nextAction.name,
        type: ActionType.SPLIT,
        displayName: 'Split',
        valid: true,
        settings: {
          options: [
            {
              id: 'jFCJvPAjs8umZSeTDC5n1',
              name: 'Branch 1',
              conditions: [
                [
                  {
                    operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                    firstValue: '',
                    secondValue: '',
                    caseSensitive: false,
                  },
                ],
              ],
            },
          ],
          inputUiInfo: {
            customizedInputs: {},
          },
          defaultBranch: 'jFCJvPAjs8umZSeTDC5n1',
        },
        branches: [],
      },
    };
    const result = flowHelper.apply(flowVersionWithSplit, operation);
    const expectedFlowVersion: FlowVersion = {
      id: '2XuLcKZWSgKkiHh6RqWXg',
      created: '2023-05-23T00:14:47.809Z',
      updated: '2023-05-23T00:14:47.809Z',
      flowId: 'YGPIPQDfLcPdJ0aJ9AKGb',
      updatedBy: '',
      displayName: 'Flow 1',
      trigger: {
        name: 'trigger',
        type: TriggerType.EMPTY,
        valid: false,
        settings: {},
        displayName: 'Select Trigger',
        nextAction: {
          displayName: 'Split',
          name: 'step_1',
          valid: true,
          type: 'SPLIT',
          settings: {
            options: [
              {
                id: 'jFCJvPAjs8umZSeTDC5n1',
                name: 'Branch 1',
                conditions: [
                  [
                    {
                      operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                      firstValue: '',
                      secondValue: '',
                      caseSensitive: false,
                    },
                  ],
                ],
              },
            ],
            inputUiInfo: {
              customizedInputs: {},
            },
            defaultBranch: 'jFCJvPAjs8umZSeTDC5n1',
          },
          branches: [
            {
              optionId: 'jFCJvPAjs8umZSeTDC5n1',
            },
          ],
        },
      },
      valid: false,
      state: FlowVersionState.DRAFT,
    };

    expect(result).toEqual(expectedFlowVersion);
  });

  it('Should add a split node', () => {
    const branchId1 = 'LsJtPYcoCJkjMR8dV_qRu';
    const branchId2 = 'UehnWevTSkxsU9fo5jH2X';

    const operation: FlowOperationRequest = {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'trigger',
        stepLocationRelativeToParent: StepLocationRelativeToParent.AFTER,
        action: {
          type: ActionType.SPLIT,
          branches: [
            {
              optionId: branchId1,
            },
            {
              optionId: branchId2,
            },
          ],
          settings: {
            defaultBranch: '',
            options: [
              {
                id: 'LsJtPYcoCJkjMR8dV_qRu',
                name: 'Branch 1',
                conditions: [
                  [
                    {
                      operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                      firstValue: '',
                      secondValue: '',
                      caseSensitive: false,
                    },
                  ],
                ],
              },
              {
                id: 'UehnWevTSkxsU9fo5jH2X',
                name: 'Branch 2',
                conditions: [
                  [
                    {
                      operator: BranchOperator.TEXT_EXACTLY_MATCHES,
                      firstValue: '',
                      secondValue: '',
                      caseSensitive: false,
                    },
                  ],
                ],
              },
            ],
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          name: 'step_1',
          valid: false,
          displayName: 'Split',
        },
      },
    };
    const result = flowHelper.apply(emptyScheduleFlowVersion, operation);
    const expectedFlowVersion: FlowVersion = {
      id: 'pj0KQ7Aypoa9OQGHzmKDl',
      created: '2023-05-24T00:16:41.353Z',
      updated: '2023-05-24T00:16:41.353Z',
      flowId: 'lod6JEdKyPlvrnErdnrGa',
      displayName: 'Standup Reminder',
      updatedBy: '',
      trigger: {
        name: 'trigger',
        type: TriggerType.BLOCK,
        valid: true,
        settings: {
          input: {
            cronExpression: '25 10 * * 0,1,2,3,4',
          },
          packageType: PackageType.REGISTRY,
          blockType: BlockType.OFFICIAL,
          blockName: 'schedule',
          blockVersion: '0.0.2',
          inputUiInfo: {},
          triggerName: 'cron_expression',
        },
        displayName: 'Cron Expression',
        nextAction: {
          displayName: 'Split',
          name: 'step_1',
          valid: false,
          type: 'SPLIT',
          settings: {
            defaultBranch: '',
            options: [
              {
                id: 'LsJtPYcoCJkjMR8dV_qRu',
                name: 'Branch 1',
                conditions: [
                  [
                    {
                      operator: 'TEXT_EXACTLY_MATCHES',
                      firstValue: '',
                      secondValue: '',
                      caseSensitive: false,
                    },
                  ],
                ],
              },
              {
                id: 'UehnWevTSkxsU9fo5jH2X',
                name: 'Branch 2',
                conditions: [
                  [
                    {
                      operator: 'TEXT_EXACTLY_MATCHES',
                      firstValue: '',
                      secondValue: '',
                      caseSensitive: false,
                    },
                  ],
                ],
              },
            ],
            inputUiInfo: {
              customizedInputs: {},
            },
          },
          branches: [{ optionId: branchId1 }, { optionId: branchId2 }],
        },
      },
      valid: false,
      state: FlowVersionState.DRAFT,
    };

    expect(result).toEqual(expectedFlowVersion);
  });

  describe('Add nodes inside a Split', () => {
    const mockCodeAction = createCodeAction('step_2');

    it('StepLocationRelativeToParent.AFTER, should add a node in nextAction', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: 'step_1',
          stepLocationRelativeToParent: StepLocationRelativeToParent.AFTER,
          action: mockCodeAction,
        },
      };
      const result = flowHelper.apply(flowVersionWithSplit, operation);

      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.nextAction).toEqual(mockCodeAction);
    });

    it('StepLocationRelativeToParent.INSIDE_SPLIT, should throw when branchNodeId is undefined', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: 'step_1',
          stepLocationRelativeToParent:
            StepLocationRelativeToParent.INSIDE_SPLIT,
          action: mockCodeAction,
        },
      };

      expect(() => flowHelper.apply(flowVersionWithSplit, operation)).toThrow(
        new ApplicationError(
          {
            code: ErrorCode.FLOW_OPERATION_INVALID,
            params: {},
          },
          'Split step parent INSIDE_SPLIT invalid, branchNodeId should be defined!',
        ),
      );
    });

    it('StepLocationRelativeToParent.INSIDE_SPLIT, should add a node in branch', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: 'step_1',
          stepLocationRelativeToParent:
            StepLocationRelativeToParent.INSIDE_SPLIT,
          branchNodeId: 'jFCJvPAjs8umZSeTDC5n1',
          action: mockCodeAction,
        },
      };
      const result = flowHelper.apply(flowVersionWithSplit, operation);

      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.branches).toEqual([
        {
          optionId: 'jFCJvPAjs8umZSeTDC5n1',
          nextAction: mockCodeAction,
        },
      ]);
    });

    it('StepLocationRelativeToParent.INSIDE_SPLIT, should add a node in existing branch', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: 'step_1',
          stepLocationRelativeToParent:
            StepLocationRelativeToParent.INSIDE_SPLIT,
          branchNodeId: 'jFCJvPAjs8umZSeTDC5n1',
          action: mockCodeAction,
        },
      };

      const result = flowHelper.apply(flowVersionWithSplit, operation);

      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.branches).toEqual([
        {
          optionId: 'jFCJvPAjs8umZSeTDC5n1',
          nextAction: {
            id: 'step_2',
            type: ActionType.CODE,
            settings: {
              input: {},
              sourceCode: {
                code: 'test',
                packageJson: '{}',
              },
            },
            name: 'step_2',
            valid: true,
            displayName: 'Code',
          },
        },
      ]);

      const mockCodeAction2: Action = {
        type: ActionType.CODE,
        settings: {
          input: {},
          sourceCode: {
            code: 'test',
            packageJson: '{}',
          },
        },
        name: 'step_30',
        valid: true,
        displayName: 'Code',
      };

      const secondOperation: FlowOperationRequest = {
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: 'step_1',
          stepLocationRelativeToParent:
            StepLocationRelativeToParent.INSIDE_SPLIT,
          branchNodeId: 'jFCJvPAjs8umZSeTDC5n1',
          action: mockCodeAction2,
        },
      };

      const result2 = flowHelper.apply(result, secondOperation);

      expect(result2.trigger.nextAction.displayName).toBe('Split');
      expect(result2.trigger.nextAction.branches).toEqual([
        {
          optionId: 'jFCJvPAjs8umZSeTDC5n1',
          nextAction: {
            type: ActionType.CODE,
            settings: {
              input: {},
              sourceCode: {
                code: 'test',
                packageJson: '{}',
              },
            },
            name: 'step_30',
            valid: true,
            displayName: 'Code',
            nextAction: {
              type: ActionType.CODE,
              settings: {
                input: {},
                sourceCode: {
                  code: 'test',
                  packageJson: '{}',
                },
              },
              id: 'step_2',
              name: 'step_2',
              valid: true,
              displayName: 'Code',
            },
          },
        },
      ]);
    });

    it('should initialize a branch and set next action when branchNodeId does not exist in the array', () => {
      const addNewBranch: FlowOperationRequest = {
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: 'step_1',
          stepLocationRelativeToParent:
            StepLocationRelativeToParent.INSIDE_SPLIT,
          branchNodeId: '123',
          action: mockCodeAction,
        },
      };

      const result = flowHelper.apply(
        {
          ...flowVersionWithSplit,
          trigger: {
            ...flowVersionWithSplit.trigger,
            nextAction: {
              ...flowVersionWithSplit.trigger.nextAction,
              branches: undefined,
            },
          },
        },
        addNewBranch,
      );

      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.branches).toEqual([
        {
          optionId: '123',
          nextAction: mockCodeAction,
        },
      ]);
      expect(
        result.trigger.nextAction.branches[0].nextAction.nextAction,
      ).toBeUndefined();
    });
  });

  describe('Update nodes inside a Split', () => {
    const mockCodeAction = createCodeAction('step_2');

    it('can update a node in nextAction', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.UPDATE_ACTION,
        request: mockCodeAction,
      };
      const result = flowHelper.apply(
        {
          ...flowVersionWithSplit,
          trigger: {
            ...flowVersionWithSplit.trigger,
            nextAction: {
              ...flowVersionWithSplit.trigger.nextAction,
              nextAction: {
                ...mockCodeAction,
                settings: {
                  ...mockCodeAction.settings,
                  sourceCode: {
                    code: '() => console.log("hello")',
                    packageJson: '{}',
                  },
                },
              },
            },
          },
        },
        operation,
      );
      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.nextAction).toEqual(mockCodeAction);
    });

    it('can update a node in branch', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.UPDATE_ACTION,
        request: mockCodeAction,
      };
      const result = flowHelper.apply(
        {
          ...flowVersionWithSplit,
          trigger: {
            ...flowVersionWithSplit.trigger,
            nextAction: {
              ...flowVersionWithSplit.trigger.nextAction,
              branches: [
                {
                  optionId: 'jFCJvPAjs8umZSeTDC5n1',
                  nextAction: {
                    ...mockCodeAction,
                    settings: {
                      ...mockCodeAction.settings,
                      sourceCode: {
                        code: '() => console.log("hello")',
                        packageJson: '{}',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        operation,
      );
      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.branches).toEqual([
        {
          optionId: 'jFCJvPAjs8umZSeTDC5n1',
          nextAction: mockCodeAction,
        },
        { optionId: 'uN9KHAKr7bDl_6Ffomn-u' },
      ]);
    });

    it('delete option from settings will delete the branch', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.UPDATE_ACTION,
        request: mockCodeAction,
      };
      // adding the first branch
      const firstResult = flowHelper.apply(
        {
          ...flowVersionWithSplit,
          trigger: {
            ...flowVersionWithSplit.trigger,
            nextAction: {
              ...flowVersionWithSplit.trigger.nextAction,
              settings: {
                ...flowVersionWithSplit.trigger.nextAction.settings,
                defaultBranch: '',
              },
              branches: [
                {
                  optionId: 'jFCJvPAjs8umZSeTDC5n1',
                  nextAction: {
                    ...mockCodeAction,
                    settings: {
                      ...mockCodeAction.settings,
                      sourceCode: {
                        code: '() => console.log("hello")',
                        packageJson: '{}',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        operation,
      );

      // updating the actiual split node
      const secondOperation: FlowOperationRequest = {
        type: FlowOperationType.UPDATE_ACTION,
        request: {
          name: flowVersionWithSplit.trigger.nextAction.name,
          type: ActionType.SPLIT,
          displayName: 'Split',
          valid: true,
          settings: {
            // options are now empty
            options: [],
            inputUiInfo: {
              customizedInputs: {},
            },
            defaultBranch: '',
          },
          branches: firstResult.trigger.nextAction.branches,
        },
      };

      const result = flowHelper.apply(firstResult, secondOperation);

      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.branches).toEqual([]);
    });

    it('delete option from settings will delete the branch with remaining options', () => {
      const operation: FlowOperationRequest = {
        type: FlowOperationType.UPDATE_ACTION,
        request: mockCodeAction,
      };
      // adding the first branch
      const firstResult = flowHelper.apply(
        {
          ...flowVersionWithSplit,
          trigger: {
            ...flowVersionWithSplit.trigger,
            nextAction: {
              ...flowVersionWithSplit.trigger.nextAction,
              settings: {
                ...flowVersionWithSplit.trigger.nextAction.settings,
                defaultBranch: '',
              },
              branches: [
                {
                  optionId: 'jFCJvPAjs8umZSeTDC5n1',
                  nextAction: null,
                },
                // this branch is deleted
                {
                  optionId: '1FCJvPAjs8umZSeTDC5n1',
                  nextAction: null,
                },
              ],
            },
          },
        },
        operation,
      );

      // updating the actiual split node
      const secondOperation: FlowOperationRequest = {
        type: FlowOperationType.UPDATE_ACTION,
        request: {
          name: flowVersionWithSplit.trigger.nextAction.name,
          type: ActionType.SPLIT,
          displayName: 'Split',
          valid: true,
          settings: {
            options: [
              {
                id: 'jFCJvPAjs8umZSeTDC5n1',
                name: 'Branch 1',
                conditions: [],
              },
            ],
            inputUiInfo: {
              customizedInputs: {},
            },
            defaultBranch: '',
          },
          branches: firstResult.trigger.nextAction.branches,
        },
      };

      const result = flowHelper.apply(firstResult, secondOperation);

      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.branches).toEqual([
        {
          optionId: 'jFCJvPAjs8umZSeTDC5n1',
          nextAction: null,
        },
      ]);
    });

    it('update other steps when split branches are undefined and update branches to empty array', async () => {
      const flowVersionWithSplitAndChildren: FlowVersion = {
        id: '2XuLcKZWSgKkiHh6RqWXg',
        created: '2023-05-23T00:14:47.809Z',
        updated: '2023-05-23T00:14:47.809Z',
        flowId: 'YGPIPQDfLcPdJ0aJ9AKGb',
        updatedBy: '',
        displayName: 'Flow 1',
        trigger: {
          name: 'trigger',
          type: TriggerType.EMPTY,
          valid: false,
          settings: {},
          nextAction: {
            name: 'step_1',
            type: 'SPLIT',
            valid: true,
            settings: {
              options: [],
              inputUiInfo: {
                customizedInputs: {},
              },
              defaultBranch: '',
            },
            // branches are undefined
            branches: undefined,
            displayName: 'Split',
            nextAction: mockCodeAction,
          },
          displayName: 'Select Trigger',
        },
        valid: true,
        state: FlowVersionState.DRAFT,
      };

      const operation: FlowOperationRequest = {
        type: FlowOperationType.UPDATE_ACTION,
        request: mockCodeAction,
      };

      const result = flowHelper.apply(
        flowVersionWithSplitAndChildren,
        operation,
      );

      expect(result.trigger.nextAction.branches).toEqual([]);
      expect(result.trigger.nextAction.nextAction).toEqual(mockCodeAction);
    });
  });

  describe('process operations', () => {
    const mockCodeAction = createCodeAction('step_2');

    it('can correctly process import operations for split with branches', () => {
      const flowVersionWithSplitWithBranches = {
        ...flowVersionWithSplit,
        trigger: {
          ...flowVersionWithSplit.trigger,
          nextAction: {
            type: ActionType.SPLIT,
            branches: [
              {
                optionId: 'LsJtPYcoCJkjMR8dV_qRu',
                nextAction: mockCodeAction,
              },
              {
                optionId: 'UehnWevTSkxsU9fo5jH2X',
              },
            ],
            settings: {
              defaultBranch: 'LsJtPYcoCJkjMR8dV_qRu',
              options: [
                {
                  id: 'LsJtPYcoCJkjMR8dV_qRu',
                  name: 'Branch 1',
                  conditions: [
                    [
                      {
                        operator: 'TEXT_EXACTLY_MATCHES',
                        firstValue: '',
                        secondValue: '',
                        caseSensitive: false,
                      },
                    ],
                  ],
                },
                {
                  id: 'UehnWevTSkxsU9fo5jH2X',
                  name: 'Branch 2',
                  conditions: [
                    [
                      {
                        operator: 'TEXT_EXACTLY_MATCHES',
                        firstValue: '',
                        secondValue: '',
                        caseSensitive: false,
                      },
                    ],
                  ],
                },
              ],
              inputUiInfo: {
                customizedInputs: {},
              },
            },
            name: 'step_1',
            valid: false,
            displayName: 'Split',
          },
        },
      };

      const expectedOperations = [
        {
          type: 'ADD_ACTION',
          request: {
            parentStep: 'trigger',
            action: {
              type: 'SPLIT',
              branches: [],
              settings: {
                defaultBranch: 'LsJtPYcoCJkjMR8dV_qRu',
                options: [
                  {
                    id: 'LsJtPYcoCJkjMR8dV_qRu',
                    name: 'Branch 1',
                    conditions: [
                      [
                        {
                          operator: 'TEXT_EXACTLY_MATCHES',
                          firstValue: '',
                          secondValue: '',
                          caseSensitive: false,
                        },
                      ],
                    ],
                  },
                  {
                    id: 'UehnWevTSkxsU9fo5jH2X',
                    name: 'Branch 2',
                    conditions: [
                      [
                        {
                          operator: 'TEXT_EXACTLY_MATCHES',
                          firstValue: '',
                          secondValue: '',
                          caseSensitive: false,
                        },
                      ],
                    ],
                  },
                ],
                inputUiInfo: {
                  customizedInputs: {},
                },
              },
              name: 'step_1',
              valid: false,
              displayName: 'Split',
            },
          },
        },
        {
          type: 'ADD_ACTION',
          request: {
            parentStep: 'step_1',
            stepLocationRelativeToParent: 'INSIDE_SPLIT',
            action: {
              type: 'CODE',
              settings: {
                input: {},
                sourceCode: {
                  code: 'test',
                  packageJson: '{}',
                },
              },
              name: 'step_2',
              valid: true,
              displayName: 'Code',
            },
            branchNodeId: 'LsJtPYcoCJkjMR8dV_qRu',
          },
        },
      ];

      const operations = flowHelper.getImportOperations(
        flowVersionWithSplitWithBranches.trigger,
      );

      // Verify structure without specific IDs
      expect(operations).toHaveLength(expectedOperations.length);
      operations.forEach((operation, index) => {
        const expectedOperation = expectedOperations[index];
        expect(operation.type).toBe(expectedOperation.type);

        const request = operation.request as {
          parentStep: string;
          action: Action;
        };
        const expectedRequest = expectedOperation.request as {
          parentStep: string;
          action: Action;
        };

        expect(request.parentStep).toBe(expectedRequest.parentStep);
        const { id, ...actionWithoutId } = request.action;
        const { id: expectedId, ...expectedActionWithoutId } =
          expectedRequest.action;
        expect(actionWithoutId).toEqual(expectedActionWithoutId);
        expect(typeof id).toBe('string');
      });
    });

    it('can process operations without stepLocationRelativeToParent', () => {
      const flowVersion: FlowVersion = {
        id: 'Yor1KxF4x00hrOoMeV6D1',
        created: '2024-10-02T06:24:56.604Z',
        updated: '2024-10-02T06:24:56.604Z',
        flowId: 'AUQ1poMROcB8JEhEtBFMl',
        displayName: 'Untitled',
        trigger: {
          displayName: 'Select Trigger',
          name: 'trigger',
          valid: false,
          type: TriggerType.EMPTY,
          settings: {
            inputUiInfo: {},
          },
          nextAction: {
            displayName: 'Split',
            name: 'step_1',
            valid: true,
            type: 'SPLIT',
            settings: {
              options: [
                {
                  id: 'gzS3OyD4ml-6_aUR8fvwv',
                  name: 'Branch 1',
                  conditions: [
                    [
                      {
                        operator: 'TEXT_EXACTLY_MATCHES',
                        firstValue: '',
                        secondValue: '',
                        caseSensitive: false,
                      },
                    ],
                  ],
                },
                {
                  id: 'hTSWOkQedieZxqENUFEm4',
                  name: 'Branch 2',
                  conditions: [
                    [
                      {
                        operator: 'TEXT_EXACTLY_MATCHES',
                        firstValue: '',
                        secondValue: '',
                        caseSensitive: false,
                      },
                    ],
                  ],
                },
              ],
              inputUiInfo: {},
              defaultBranch: '',
            },
            branches: [],
          },
        },
        updatedBy: null,
        valid: false,
        state: FlowVersionState.DRAFT,
      };

      const operationWihoutStepLocationRelativeToParrent: FlowOperationRequest =
        {
          type: FlowOperationType.ADD_ACTION,
          request: {
            parentStep: 'step_1',
            action: {
              name: 'step_3',
              type: ActionType.BRANCH,
              valid: false,
              settings: {
                conditions: [[]],
                inputUiInfo: {},
              },
              displayName: 'Condition',
            },
          },
        };

      const result = flowHelper.apply(
        flowVersion,
        operationWihoutStepLocationRelativeToParrent,
      );

      expect(result.trigger.nextAction.displayName).toBe('Split');
      expect(result.trigger.nextAction.nextAction.displayName).toBe(
        'Condition',
      );
    });
  });
});

describe('bulkAddActions', () => {
  const initialFlowVersion: FlowVersion = {
    id: 'ep9PFPiqN5ibHqTwc9b7E',
    created: '2025-03-19T15:58:50.098Z',
    updated: '2025-03-19T16:58:37.259Z',
    flowId: 'uRntBYGwAAf0Sy9eFdFmO',
    description: '',
    displayName: 'Untitled',
    trigger: {
      name: 'trigger',
      type: TriggerType.EMPTY,
      valid: false,
      settings: {},
      nextAction: {
        name: 'step_4',
        type: 'LOOP_ON_ITEMS',
        valid: false,
        settings: {
          items: '',
          inputUiInfo: {
            customizedInputs: {},
          },
        },
        nextAction: {
          name: 'step_2',
          type: 'SPLIT',
          valid: true,
          branches: [
            {
              optionId: '24MiXRtodWv89yyBRntcN',
            },
            {
              optionId: 'HAiU9lCIo0LUIrBnzvBz5',
            },
            {
              optionId: 'dPQh9gH75Y5JELFuGQlRM',
            },
          ],
          settings: {
            options: [
              {
                id: '24MiXRtodWv89yyBRntcN',
                name: 'Branch 1',
                conditions: [[]],
              },
              {
                id: 'HAiU9lCIo0LUIrBnzvBz5',
                name: 'Branch 2',
                conditions: [
                  [
                    {
                      operator: 'TEXT_EXACTLY_MATCHES',
                      firstValue: '',
                      secondValue: '',
                      caseSensitive: false,
                    },
                  ],
                ],
              },
              {
                id: 'dPQh9gH75Y5JELFuGQlRM',
                name: 'Branch 3',
                conditions: [
                  [
                    {
                      operator: 'TEXT_EXACTLY_MATCHES',
                      firstValue: '',
                      secondValue: '',
                      caseSensitive: false,
                    },
                  ],
                ],
              },
            ],
            inputUiInfo: {
              customizedInputs: {},
            },
            defaultBranch: '24MiXRtodWv89yyBRntcN',
          },
          nextAction: {
            name: 'step_3',
            type: 'BRANCH',
            valid: false,
            settings: {
              conditions: [
                [
                  {
                    operator: 'TEXT_CONTAINS',
                    firstValue: '',
                    secondValue: '',
                    caseSensitive: false,
                  },
                ],
              ],
              inputUiInfo: {
                customizedInputs: {},
              },
            },
            nextAction: {
              name: 'step_13',
              type: 'SPLIT',
              valid: true,
              branches: [
                {
                  optionId: 'i2lL0q2t9YaF2-frdC9-k',
                },
                {
                  optionId: 'c6jtOpzg4HiC7Lc2E7XEx',
                },
                {
                  optionId: 'NkOGIbSzokL-EMTpasd0b',
                },
              ],
              settings: {
                options: [
                  {
                    id: 'i2lL0q2t9YaF2-frdC9-k',
                    name: 'Branch 1',
                    conditions: [[]],
                  },
                  {
                    id: 'c6jtOpzg4HiC7Lc2E7XEx',
                    name: 'Branch 2',
                    conditions: [
                      [
                        {
                          operator: 'TEXT_EXACTLY_MATCHES',
                          firstValue: '',
                          secondValue: '',
                          caseSensitive: false,
                        },
                      ],
                    ],
                  },
                  {
                    id: 'NkOGIbSzokL-EMTpasd0b',
                    name: 'Branch 3',
                    conditions: [
                      [
                        {
                          operator: 'TEXT_EXACTLY_MATCHES',
                          firstValue: '',
                          secondValue: '',
                          caseSensitive: false,
                        },
                      ],
                    ],
                  },
                ],
                inputUiInfo: {
                  customizedInputs: {},
                },
                defaultBranch: 'i2lL0q2t9YaF2-frdC9-k',
              },
              displayName: 'Split',
            },
            displayName: 'Condition',
          },
          displayName: 'Split',
        },
        displayName: 'Loop on Items',
      },
      displayName: 'Select Trigger',
    },
    updatedBy: 'hnQ6Ca6N1cHU6U6BBtNn2',
    valid: false,
    state: FlowVersionState.DRAFT,
  };

  const action = {
    ...createCodeAction('step_20'),
    displayName: 'COPY 1',
    nextAction: {
      ...createCodeAction('step_30'),
      displayName: 'COPY 2',
    },
  };

  const getPasteRequest = (
    parentStep: string,
    stepLocationRelativeToParent: StepLocationRelativeToParent,
    branchNodeId?: string,
  ): PasteActionsRequest => {
    return {
      action,
      parentStep,
      stepLocationRelativeToParent,
      branchNodeId,
    };
  };

  it('should paste AFTER', () => {
    const result = flowHelper.apply(initialFlowVersion, {
      type: FlowOperationType.PASTE_ACTIONS,
      request: getPasteRequest('step_4', StepLocationRelativeToParent.AFTER),
    });

    const parent = flowHelper.getStep(result, 'step_4');

    expect(parent?.nextAction.name).toEqual(action.name);
    expect(parent?.nextAction.nextAction.name).toEqual(action.nextAction.name);
  });

  it('should paste INSIDE_LOOP', () => {
    const result = flowHelper.apply(initialFlowVersion, {
      type: FlowOperationType.PASTE_ACTIONS,
      request: getPasteRequest(
        'step_4',
        StepLocationRelativeToParent.INSIDE_LOOP,
      ),
    });

    const parent = flowHelper.getStep(result, 'step_4');

    if (parent && parent.type === 'LOOP_ON_ITEMS') {
      expect(parent.firstLoopAction?.name).toEqual(action.name);
      expect(parent.firstLoopAction?.nextAction?.name).toEqual(
        action.nextAction.name,
      );
    } else {
      throw new Error('LOOP_ON_ITEMS block is not found');
    }
  });

  it('should paste INSIDE_FALSE_BRANCH', () => {
    const result = flowHelper.apply(initialFlowVersion, {
      type: FlowOperationType.PASTE_ACTIONS,
      request: getPasteRequest(
        'step_3',
        StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
      ),
    });

    const parent = flowHelper.getStep(result, 'step_3');

    if (parent && parent.type === 'BRANCH') {
      expect(parent.onFailureAction?.name).toEqual(action.name);
      expect(parent.onFailureAction?.nextAction?.name).toEqual(
        action.nextAction.name,
      );
    } else {
      throw new Error('BRANCH block is not found');
    }
  });

  it('should paste INSIDE_SPLIT', () => {
    const branchId = '24MiXRtodWv89yyBRntcN';
    const result = flowHelper.apply(initialFlowVersion, {
      type: FlowOperationType.PASTE_ACTIONS,
      request: getPasteRequest(
        'step_2',
        StepLocationRelativeToParent.INSIDE_SPLIT,
        branchId,
      ),
    });

    const parent = flowHelper.getStep(result, 'step_2');

    let branch;

    if (parent && parent.type === 'SPLIT') {
      branch = parent.branches.find((branch) => branch.optionId === branchId);
    } else {
      throw new Error('SPLIT block is not found');
    }

    expect(branch?.nextAction.name).toEqual(action.name);
    expect(branch?.nextAction.nextAction.name).toEqual(action.nextAction.name);
  });
});

it('should add id field when adding a new action', () => {
  const addBlockRequest: FlowOperationRequest = {
    type: FlowOperationType.ADD_ACTION,
    request: {
      parentStep: 'trigger',
      action: createBlockAction('step_1', 'Get', {
        input: {
          key: '1',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'store',
        blockVersion: '0.2.6',
        actionName: 'get',
        inputUiInfo: {
          customizedInputs: {},
        },
      }),
    },
  };
  const resultFlow = flowHelper.apply(
    emptyScheduleFlowVersion,
    addBlockRequest,
  );
  expect(resultFlow.trigger.nextAction).toHaveProperty('id', 'step_1');
});

it('should preserve id field when updating an action', () => {
  const addBlockRequest: FlowOperationRequest = {
    type: FlowOperationType.ADD_ACTION,
    request: {
      parentStep: 'trigger',
      action: createBlockAction('step_1', 'Get', {
        input: {
          key: '1',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'store',
        blockVersion: '0.2.6',
        actionName: 'get',
        inputUiInfo: {
          customizedInputs: {},
        },
      }),
    },
  };
  let resultFlow = flowHelper.apply(emptyScheduleFlowVersion, addBlockRequest);

  const updateRequest: FlowOperationRequest = {
    type: FlowOperationType.UPDATE_ACTION,
    request: createBlockAction('step_1', 'Get Updated', {
      input: {
        key: '2',
      },
      packageType: PackageType.REGISTRY,
      blockType: BlockType.OFFICIAL,
      blockName: 'store',
      blockVersion: '0.2.6',
      actionName: 'get',
      inputUiInfo: {
        customizedInputs: {},
      },
    }),
  };
  resultFlow = flowHelper.apply(resultFlow, updateRequest);
  expect(resultFlow.trigger.nextAction).toHaveProperty('id', 'step_1');
});

it('should add id field to child actions when adding them', () => {
  const addBranchRequest: FlowOperationRequest = {
    type: FlowOperationType.ADD_ACTION,
    request: {
      parentStep: 'trigger',
      action: createBranchAction('step_1', {
        conditions: [
          [
            {
              operator: BranchOperator.TEXT_CONTAINS,
              firstValue: '1',
              secondValue: '1',
              caseSensitive: true,
            },
          ],
        ],
        inputUiInfo: {},
      }),
    },
  };
  let resultFlow = flowHelper.apply(emptyScheduleFlowVersion, addBranchRequest);

  const addCodeActionOnTrue: FlowOperationRequest = {
    type: FlowOperationType.ADD_ACTION,
    request: {
      parentStep: 'step_1',
      stepLocationRelativeToParent:
        StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
      action: createCodeAction('step_2'),
    },
  };
  resultFlow = flowHelper.apply(resultFlow, addCodeActionOnTrue);
  expect(resultFlow.trigger.nextAction.onSuccessAction).toHaveProperty(
    'id',
    'step_2',
  );
});

describe('getUsedConnections', () => {
  const actionWithBrokenConnections = {
    settings: {
      blockName: '',
      input: { auth: "{{connections['connection1']}}" },
    },
    nextAction: {
      settings: {
        blockName: 'step2',
        input: {},
      },
    },
  } as unknown as Action;
  it('returns used connection names mapped by block name', () => {
    const action = {
      settings: {
        blockName: 'step1',
        input: { auth: "{{connections['connection1']}}" },
      },
      nextAction: {
        settings: {
          blockName: 'step2',
          input: { auth: "{{connections['connection2']}}" },
        },
      },
    } as unknown as Action;

    const result = flowHelper.getUsedConnections(action);

    expect(result).toEqual({
      step1: 'connection1',
      step2: 'connection2',
    });
  });

  it('ignores steps without blockName or auth', () => {
    const result = flowHelper.getUsedConnections(actionWithBrokenConnections);

    expect(result).toEqual({});
  });

  it('ignores steps where removeConnectionBrackets returns falsy', () => {
    const result = flowHelper.getUsedConnections(actionWithBrokenConnections);

    expect(result).toEqual({});
  });

  it('returns an empty object if getAllSteps returns empty', () => {
    const result = flowHelper.getUsedConnections(actionWithBrokenConnections);
    expect(result).toEqual({});
  });
});

describe('createTrigger', () => {
  it('should create an EMPTY trigger', () => {
    const name = 'trigger';
    const request = {
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
    };
    const nextAction = undefined;

    const result = flowHelper.createTrigger(name, request as any, nextAction);

    expect(result).toEqual({
      id: expect.any(String),
      name: 'trigger',
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
      valid: true,
      nextAction: undefined,
    });
  });

  it('should create a BLOCK trigger', () => {
    const name = 'trigger';
    const request = {
      type: TriggerType.BLOCK,
      displayName: 'Block Trigger',
      settings: {
        input: {
          cronExpression: '25 10 * * 0,1,2,3,4',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'schedule',
        blockVersion: '0.0.2',
        inputUiInfo: {},
        triggerName: 'cron_expression',
      },
    };
    const nextAction = createCodeAction('step_1');

    const result = flowHelper.createTrigger(name, request as any, nextAction);

    expect(result).toEqual({
      id: expect.any(String),
      name: 'trigger',
      type: TriggerType.BLOCK,
      displayName: 'Block Trigger',
      settings: {
        input: {
          cronExpression: '25 10 * * 0,1,2,3,4',
        },
        packageType: PackageType.REGISTRY,
        blockType: BlockType.OFFICIAL,
        blockName: 'schedule',
        blockVersion: '0.0.2',
        inputUiInfo: {},
        triggerName: 'cron_expression',
      },
      valid: true,
      nextAction,
    });
  });

  it('should create trigger with custom id', () => {
    const name = 'trigger';
    const request = {
      id: 'custom-id',
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
    };
    const nextAction = undefined;

    const result = flowHelper.createTrigger(name, request as any, nextAction);

    expect(result).toEqual({
      id: 'custom-id',
      name: 'trigger',
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
      valid: true,
      nextAction: undefined,
    });
  });

  it('should create trigger with valid=false when specified', () => {
    const name = 'trigger';
    const request = {
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
      valid: false,
    };
    const nextAction = undefined;

    const result = flowHelper.createTrigger(name, request as any, nextAction);

    expect(result).toEqual({
      id: expect.any(String),
      name: 'trigger',
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
      valid: false,
      nextAction: undefined,
    });
  });

  it('should create trigger with nextAction', () => {
    const name = 'trigger';
    const request = {
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
    };
    const nextAction = createCodeAction('step_1');

    const result = flowHelper.createTrigger(name, request as any, nextAction);

    expect(result).toEqual({
      id: expect.any(String),
      name: 'trigger',
      type: TriggerType.EMPTY,
      displayName: 'Empty Trigger',
      settings: {},
      valid: true,
      nextAction,
    });
  });
});
