import {
  Action,
  ActionType,
  ApplicationError,
  BlockType,
  BranchOperator,
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
        ...createBranchAction('step_1', {
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
    const updateFlowVersion = flowHelper.apply(
      flowVersionWithBranching,
      updateRequest,
    );
    const expectedFlowTrigger: Trigger = {
      name: 'trigger',
      type: TriggerType.BLOCK,
      valid: true,
      displayName: 'Cron Expression',
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
        id: 'step_1',
        name: 'step_1',
        type: 'BRANCH',
        valid: true,
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
        nextAction: {
          name: 'step_4',
          type: 'BLOCK',
          valid: true,
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
        },
        onFailureAction: {
          name: 'step_3',
          type: 'CODE',
          valid: true,
          displayName: 'Code',
          settings: {
            input: {},
            sourceCode: {
              code: 'test',
              packageJson: '{}',
            },
          },
        },
        onSuccessAction: {
          name: 'step_2',
          type: 'BLOCK',
          valid: true,
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
        },
      },
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
        ...createBranchAction('step_1', {
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
        onSuccessAction: createCodeAction('step_2'),
        onFailureAction: createCodeAction('step_3'),
        nextAction: createCodeAction('step_4'),
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
        ...createLoopAction('step_1', {
          items: 'items',
          inputUiInfo: {},
        }),
        firstLoopAction: createCodeAction('step_3'),
        nextAction: createCodeAction('step_4'),
      },
    };
    expect(resultFlow.trigger).toEqual(expectedTrigger);
  });

  it('should block adding step if it already exists in the flow', () => {
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
    let resultFlow = emptyScheduleFlowVersion;
    resultFlow = flowHelper.apply(resultFlow, addBlockRequest);
    expect(() => {
      flowHelper.apply(resultFlow, addBlockRequest);
    }).toThrow(ApplicationError);
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
    let resultFlow = flowHelper.apply(
      emptyScheduleFlowVersion,
      addBlockRequest,
    );

    const updateRequest: FlowOperationRequest = {
      type: FlowOperationType.UPDATE_ACTION,
      request: {
        ...createBlockAction('step_1', 'Get Updated', {
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
      },
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
    let resultFlow = flowHelper.apply(
      emptyScheduleFlowVersion,
      addBranchRequest,
    );

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
        ...createBranchAction('step_1', {
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
        nextAction: createBlockAction('step_4', 'Get', {
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
        onFailureAction: createCodeAction('step_3'),
        onSuccessAction: createBlockAction('step_2', 'Send Message Webhook', {
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
        }),
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
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        action: createBlockAction('step_4', 'Get', {
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
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent:
          StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
        action: createCodeAction('step_3'),
      },
    },
    {
      type: FlowOperationType.ADD_ACTION,
      request: {
        parentStep: 'step_1',
        stepLocationRelativeToParent:
          StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
        action: createBlockAction('step_2', 'Send Message Webhook', {
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
        }),
      },
    },
  ];
  const importOperations = flowHelper.getImportOperations(flowVersion.trigger);
  expect(importOperations).toEqual(expectedImportOperations);
});
it('Duplicate Flow With Loops using Import', () => {
  const addLoopRequest: FlowOperationRequest = {
    type: FlowOperationType.ADD_ACTION,
    request: {
      parentStep: 'trigger',
      action: createLoopAction('step_1', {
        items: '',
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
  resultFlow = flowHelper.apply(resultFlow, addLoopRequest);
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
      ...createLoopAction('step_1', {
        items: '',
        inputUiInfo: {},
      }),
      firstLoopAction: createCodeAction('step_3'),
      nextAction: createCodeAction('step_4'),
    },
  };
  expect(resultFlow.trigger).toEqual(expectedTrigger);
});
