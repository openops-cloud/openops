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
        action: {
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
        action: {
          name: 'step_1',
          type: ActionType.LOOP_ON_ITEMS,
          displayName: 'Loop',
          valid: true,
          settings: {
            items: 'items',
            inputUiInfo: {},
          },
        },
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
  expect(importOperations).toEqual(expectedImportOperations);
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
        },
      },
    },
  ];

  const importOperations = flowHelper.getImportOperations(flowVersion.trigger);
  expect(importOperations).toEqual(expectedResult);
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
  const mockAction: Action = {
    name: 'step_1',
    type: ActionType.BLOCK,
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
  };

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

  const mockSlackAction: Action = {
    name: 'step_1',
    type: ActionType.BLOCK,
    valid: false,
    settings: {
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
    },
    displayName: 'Send Message',
  };

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

    expect(result).toEqual([
      {
        type: 'ADD_ACTION',
        request: {
          parentStep: 'trigger',
          action: mockAction,
        },
      },
    ]);
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

  it('should not change connection when block name does not match', () => {
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
    const mockCodeAction: Action = {
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
    };

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
    const mockCodeAction: Action = {
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
    };
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
    const mockCodeAction: Action = {
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
    };
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
      expect(operations).toEqual(expectedOperations);
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
