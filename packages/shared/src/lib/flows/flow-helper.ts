import { TypeCompiler } from '@sinclair/typebox/compiler';
import semver from 'semver';
import { AppConnectionWithoutSensitiveData } from '../app-connection/app-connection';
import { addConnectionBrackets } from '../app-connection/connections-utils';
import { applyFunctionToValuesSync, isNil, isString } from '../common';
import { ApplicationError, ErrorCode } from '../common/application-error';
import {
  Action,
  ActionType,
  BranchAction,
  LoopOnItemsAction,
  SingleActionSchema,
  SplitAction,
  SplitActionSchema,
  SplitBranch,
} from './actions/action';
import {
  AddActionRequest,
  DeleteActionRequest,
  FlowOperationRequest,
  FlowOperationType,
  MoveActionRequest,
  PasteActionsRequest,
  StepLocationRelativeToParent,
  UpdateActionRequest,
  UpdateTriggerRequest,
} from './flow-operations';
import { FlowVersion, FlowVersionState } from './flow-version';
import { DEFAULT_SAMPLE_DATA_SETTINGS } from './sample-data';
import { Trigger, TriggerType } from './triggers/trigger';
type Step = Action | Trigger;

type GetStepFromSubFlow = {
  subFlowStartStep: Step;
  stepName: string;
};

const actionSchemaValidator = TypeCompiler.Compile(SingleActionSchema);
const triggerSchemaValidation = TypeCompiler.Compile(Trigger);

function isValid(flowVersion: FlowVersion): boolean {
  let valid = true;
  const steps = flowHelper.getAllSteps(flowVersion.trigger);
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    valid = valid && step.valid;
  }
  return valid;
}

function isAction(type: ActionType | TriggerType | undefined): boolean {
  return Object.entries(ActionType).some(([, value]) => value === type);
}

function isTrigger(type: ActionType | TriggerType | undefined): boolean {
  return Object.entries(TriggerType).some(([, value]) => value === type);
}

function deleteAction(
  flowVersion: FlowVersion,
  request: DeleteActionRequest,
): FlowVersion {
  return transferFlow(flowVersion, (parentStep) => {
    if (parentStep.nextAction && parentStep.nextAction.name === request.name) {
      const stepToUpdate: Action = parentStep.nextAction;
      parentStep.nextAction = stepToUpdate.nextAction;
    }
    switch (parentStep.type) {
      case ActionType.SPLIT: {
        const branch = parentStep.branches?.find(
          (branch) => branch.nextAction?.name === request.name,
        );
        if (branch && branch.nextAction) {
          branch.nextAction = branch.nextAction.nextAction;
        }
        break;
      }
      case ActionType.BRANCH: {
        if (
          parentStep.onFailureAction &&
          parentStep.onFailureAction.name === request.name
        ) {
          const stepToUpdate: Action = parentStep.onFailureAction;
          parentStep.onFailureAction = stepToUpdate.nextAction;
        }
        if (
          parentStep.onSuccessAction &&
          parentStep.onSuccessAction.name === request.name
        ) {
          const stepToUpdate: Action = parentStep.onSuccessAction;
          parentStep.onSuccessAction = stepToUpdate.nextAction;
        }
        break;
      }
      case ActionType.LOOP_ON_ITEMS: {
        if (
          parentStep.firstLoopAction &&
          parentStep.firstLoopAction.name === request.name
        ) {
          const stepToUpdate: Action = parentStep.firstLoopAction;
          parentStep.firstLoopAction = stepToUpdate.nextAction;
        }
        break;
      }
      default:
        break;
    }
    return parentStep;
  });
}

function getUsedBlocks(trigger: Trigger): string[] {
  return traverseInternal(trigger)
    .filter(
      (step) =>
        step.type === ActionType.BLOCK || step.type === TriggerType.BLOCK,
    )
    .map((step) => step.settings.blockName)
    .filter((value, index, self) => self.indexOf(value) === index);
}

function traverseInternal(
  step: Trigger | Action | undefined,
): (Action | Trigger)[] {
  const steps: (Action | Trigger)[] = [];
  while (step !== undefined && step !== null) {
    steps.push(step);
    if (step.type === ActionType.BRANCH) {
      steps.push(...traverseInternal(step.onSuccessAction));
      steps.push(...traverseInternal(step.onFailureAction));
    }
    if (step.type === ActionType.SPLIT) {
      step.branches?.forEach((branch) => {
        steps.push(...traverseInternal(branch.nextAction));
      });
    }
    if (step.type === ActionType.LOOP_ON_ITEMS) {
      steps.push(...traverseInternal(step.firstLoopAction));
    }
    step = step.nextAction;
  }
  return steps;
}

async function transferStepAsync<T extends Step>(
  step: Step,
  transferFunction: (step: T) => Promise<T>,
): Promise<Step> {
  const updatedStep = await transferFunction(step as T);

  if (updatedStep.type === ActionType.BRANCH) {
    const { onSuccessAction, onFailureAction } = updatedStep;
    if (onSuccessAction) {
      updatedStep.onSuccessAction = (await transferStepAsync(
        onSuccessAction,
        transferFunction,
      )) as Action;
    }
    if (onFailureAction) {
      updatedStep.onFailureAction = (await transferStepAsync(
        onFailureAction,
        transferFunction,
      )) as Action;
    }
  } else if (updatedStep.type === ActionType.SPLIT) {
    await Promise.all(
      updatedStep.branches?.map(async (branch) => {
        if (branch.nextAction) {
          branch.nextAction = (await transferStepAsync(
            branch.nextAction,
            transferFunction,
          )) as Action;
        }
      }),
    );
  } else if (updatedStep.type === ActionType.LOOP_ON_ITEMS) {
    const { firstLoopAction } = updatedStep;
    if (firstLoopAction) {
      updatedStep.firstLoopAction = (await transferStepAsync(
        firstLoopAction,
        transferFunction,
      )) as Action;
    }
  }

  if (updatedStep.nextAction) {
    updatedStep.nextAction = (await transferStepAsync(
      updatedStep.nextAction,
      transferFunction,
    )) as Action;
  }

  return updatedStep;
}

function transferStep<T extends Step>(
  step: Step,
  transferFunction: (step: T) => T,
): Step {
  const updatedStep = transferFunction(step as T);
  if (updatedStep.type === ActionType.BRANCH) {
    const { onSuccessAction, onFailureAction } = updatedStep;
    if (onSuccessAction) {
      updatedStep.onSuccessAction = transferStep(
        onSuccessAction,
        transferFunction,
      ) as Action;
    }
    if (onFailureAction) {
      updatedStep.onFailureAction = transferStep(
        onFailureAction,
        transferFunction,
      ) as Action;
    }
  } else if (updatedStep.type === ActionType.LOOP_ON_ITEMS) {
    const { firstLoopAction } = updatedStep;
    if (firstLoopAction) {
      updatedStep.firstLoopAction = transferStep(
        firstLoopAction,
        transferFunction,
      ) as Action;
    }
  } else if (updatedStep.type === ActionType.SPLIT) {
    updatedStep.branches?.forEach((branch) => {
      if (branch.nextAction) {
        branch.nextAction = transferStep(
          branch.nextAction,
          transferFunction,
        ) as Action;
      }
    });
  }

  if (updatedStep.nextAction) {
    updatedStep.nextAction = transferStep(
      updatedStep.nextAction,
      transferFunction,
    ) as Action;
  }

  return updatedStep;
}

async function transferFlowAsync<T extends Step>(
  flowVersion: FlowVersion,
  transferFunction: (step: T) => Promise<T>,
): Promise<FlowVersion> {
  const clonedFlow = JSON.parse(JSON.stringify(flowVersion));
  clonedFlow.trigger = (await transferStepAsync(
    clonedFlow.trigger,
    transferFunction,
  )) as Trigger;
  return clonedFlow;
}

function transferFlow<T extends Step>(
  flowVersion: FlowVersion,
  transferFunction: (step: T) => T,
): FlowVersion {
  const clonedFlow = JSON.parse(JSON.stringify(flowVersion));
  clonedFlow.trigger = transferStep(
    clonedFlow.trigger,
    transferFunction,
  ) as Trigger;
  return clonedFlow;
}
function getAllSteps(trigger: Trigger | Action): (Action | Trigger)[] {
  return traverseInternal(trigger);
}

function getAllStepsAtFirstLevel(step: Step): Step[] {
  const steps: Step[] = [];
  steps.push(step);
  let nextAction: Step | undefined = step.nextAction;
  while (nextAction !== undefined) {
    steps.push(nextAction);
    nextAction = nextAction.nextAction;
  }
  return steps;
}

function clearStepTestData(step: Step): void {
  if (step.settings.inputUiInfo) {
    step.settings.inputUiInfo.currentSelectedData = undefined;
    step.settings.inputUiInfo.lastTestDate = undefined;
  }
}
function getAllChildSteps(
  action: LoopOnItemsAction | BranchAction | SplitAction,
): Action[] {
  switch (action.type) {
    case ActionType.LOOP_ON_ITEMS:
      return traverseInternal(action.firstLoopAction) as Action[];
    case ActionType.SPLIT: {
      return (
        action.branches?.flatMap(
          (branch) => traverseInternal(branch.nextAction) as Action[],
        ) ?? []
      );
    }
    default:
      return [
        ...traverseInternal(action.onSuccessAction),
        ...traverseInternal(action.onFailureAction),
      ] as Action[];
  }
}

function getStep(
  flowVersion: FlowVersion,
  stepName: string,
): Action | Trigger | undefined {
  return getAllSteps(flowVersion.trigger).find(
    (step) => step.name === stepName,
  );
}

function getSplitBranches(step: SplitActionSchema): SplitBranch[] {
  return step.settings?.options.map((option) => ({
    optionId: option.id,
  }));
}

function truncateFlow(firstStep: Step, lastStepName: string): Step {
  if (firstStep.name !== lastStepName && firstStep.nextAction) {
    truncateFlow(firstStep.nextAction, lastStepName);
  } else {
    firstStep.nextAction = undefined;
  }
  return firstStep;
}

const getStepFromSubFlow = ({
  subFlowStartStep,
  stepName,
}: GetStepFromSubFlow): Step | undefined => {
  const subFlowSteps = getAllSteps(subFlowStartStep);

  return subFlowSteps.find((step) => step.name === stepName);
};
function updateAction(
  flowVersion: FlowVersion,
  request: UpdateActionRequest,
): FlowVersion {
  return transferFlow(flowVersion, (parentStep) => {
    if (parentStep.nextAction && parentStep.nextAction.name === request.name) {
      const actions = extractActions(parentStep.nextAction);
      parentStep.nextAction = createAction(request, actions);
    }

    if (parentStep.type === ActionType.SPLIT) {
      parentStep.branches = parentStep.branches ?? getSplitBranches(parentStep);
      const branch = parentStep.branches.find(
        (branch) => branch.nextAction?.name === request.name,
      );

      if (branch) {
        branch.nextAction = createAction(
          request,
          extractActions(branch.nextAction),
        );
      }

      // we need to sync branches with options
      const branchesThatAreStillInUse = parentStep.settings.options.map(
        (o) => o.id,
      );
      parentStep.branches = branchesThatAreStillInUse.map((branchId) => {
        const branch = parentStep.branches.find(
          (branch) => branch.optionId === branchId,
        );
        return branch ?? { optionId: branchId };
      });
    }

    if (parentStep.type === ActionType.BRANCH) {
      if (
        parentStep.onFailureAction &&
        parentStep.onFailureAction.name === request.name
      ) {
        const actions = extractActions(parentStep.onFailureAction);
        parentStep.onFailureAction = createAction(request, actions);
      }
      if (
        parentStep.onSuccessAction &&
        parentStep.onSuccessAction.name === request.name
      ) {
        const actions = extractActions(parentStep.onSuccessAction);
        parentStep.onSuccessAction = createAction(request, actions);
      }
    }
    if (parentStep.type === ActionType.LOOP_ON_ITEMS) {
      if (
        parentStep.firstLoopAction &&
        parentStep.firstLoopAction.name === request.name
      ) {
        const actions = extractActions(parentStep.firstLoopAction);
        parentStep.firstLoopAction = createAction(request, actions);
      }
    }
    return parentStep;
  });
}

function extractActions(step: Trigger | Action): {
  nextAction?: Action;
  onSuccessAction?: Action;
  onFailureAction?: Action;
  firstLoopAction?: Action;
  branches?: { optionId: string; nextAction?: Action }[];
} {
  const nextAction = step.nextAction;
  const onSuccessAction =
    step.type === ActionType.BRANCH ? step.onSuccessAction : undefined;
  const onFailureAction =
    step.type === ActionType.BRANCH ? step.onFailureAction : undefined;
  const firstLoopAction =
    step.type === ActionType.LOOP_ON_ITEMS ? step.firstLoopAction : undefined;
  const branches = step.type === ActionType.SPLIT ? step.branches : [];
  return {
    nextAction,
    branches,
    onSuccessAction,
    onFailureAction,
    firstLoopAction,
  };
}

function moveAction(
  flowVersion: FlowVersion,
  request: MoveActionRequest,
): FlowVersion {
  const steps = getAllSteps(flowVersion.trigger);
  const sourceStep = steps.find((step) => step.name === request.name);
  if (!sourceStep || !isAction(sourceStep.type)) {
    throw new ApplicationError(
      {
        code: ErrorCode.FLOW_OPERATION_INVALID,
        params: {},
      },
      `Source step ${request.name} not found`,
    );
  }
  const destinationStep = steps.find(
    (step) => step.name === request.newParentStep,
  );
  if (!destinationStep) {
    throw new ApplicationError(
      {
        code: ErrorCode.FLOW_OPERATION_INVALID,
        params: {},
      },
      `Destination step ${request.newParentStep} not found`,
    );
  }
  const childOperation: FlowOperationRequest[] = [];
  const clonedSourceStep: Step = JSON.parse(JSON.stringify(sourceStep));
  if (
    clonedSourceStep.type === ActionType.LOOP_ON_ITEMS ||
    clonedSourceStep.type === ActionType.BRANCH ||
    clonedSourceStep.type === ActionType.SPLIT
  ) {
    // Don't Clone the next action for first step only
    clonedSourceStep.nextAction = undefined;
    childOperation.push(...getImportOperations(clonedSourceStep));
  }
  flowVersion = deleteAction(flowVersion, { name: request.name });
  flowVersion = addAction(flowVersion, {
    action: sourceStep as Action,
    parentStep: request.newParentStep,
    stepLocationRelativeToParent: request.stepLocationRelativeToNewParent,
    branchNodeId: request.branchNodeId,
  });

  childOperation.forEach((operation) => {
    flowVersion = flowHelper.apply(flowVersion, operation);
  });
  return flowVersion;
}
function bulkAddActions(
  flowVersion: FlowVersion,
  request: PasteActionsRequest,
): FlowVersion {
  const action = request.action as unknown as Action;

  return duplicateStepCascading(
    action,
    flowVersion,
    request.parentStep,
    request.stepLocationRelativeToParent,
    request.branchNodeId,
  );
}

function addAction(
  flowVersion: FlowVersion,
  request: AddActionRequest,
): FlowVersion {
  const steps = getAllSteps(flowVersion.trigger);
  if (steps.find((step) => step.name === request.action.name)) {
    throw new ApplicationError(
      {
        code: ErrorCode.FLOW_OPERATION_INVALID,
        params: {},
      },
      `Step ${request.action.name} already exists`,
    );
  }

  return transferFlow(flowVersion, (parentStep: Step) => {
    if (parentStep.name !== request.parentStep) {
      return parentStep;
    }

    // when stepLocationRelativeToParent is missing or AFTER, the action should be added after the current step
    if (
      !request.stepLocationRelativeToParent ||
      request.stepLocationRelativeToParent ===
        StepLocationRelativeToParent.AFTER
    ) {
      parentStep.nextAction = createAction(request.action, {
        nextAction: parentStep.nextAction,
      });

      return parentStep;
    }

    if (parentStep.type === ActionType.LOOP_ON_ITEMS) {
      if (
        request.stepLocationRelativeToParent ===
        StepLocationRelativeToParent.INSIDE_LOOP
      ) {
        parentStep.firstLoopAction = createAction(request.action, {
          nextAction: parentStep.firstLoopAction,
        });
      } else {
        throw new ApplicationError(
          {
            code: ErrorCode.FLOW_OPERATION_INVALID,
            params: {},
          },
          `Loop step parent ${request.stepLocationRelativeToParent} not found`,
        );
      }
    } else if (parentStep.type === ActionType.BRANCH) {
      if (
        request.stepLocationRelativeToParent ===
        StepLocationRelativeToParent.INSIDE_TRUE_BRANCH
      ) {
        parentStep.onSuccessAction = createAction(request.action, {
          nextAction: parentStep.onSuccessAction,
        });
      } else if (
        request.stepLocationRelativeToParent ===
        StepLocationRelativeToParent.INSIDE_FALSE_BRANCH
      ) {
        parentStep.onFailureAction = createAction(request.action, {
          nextAction: parentStep.onFailureAction,
        });
      } else {
        throw new ApplicationError(
          {
            code: ErrorCode.FLOW_OPERATION_INVALID,
            params: {},
          },
          `Branch step parent ${request.stepLocationRelativeToParent} not found`,
        );
      }
    } else if (parentStep.type === ActionType.SPLIT) {
      if (
        request.stepLocationRelativeToParent ===
        StepLocationRelativeToParent.INSIDE_SPLIT
      ) {
        if (!request.branchNodeId) {
          throw new ApplicationError(
            {
              code: ErrorCode.FLOW_OPERATION_INVALID,
              params: {},
            },
            `Split step parent ${request.stepLocationRelativeToParent} invalid, branchNodeId should be defined!`,
          );
        }

        parentStep.branches = parentStep.branches || [];
        const branch: SplitBranch | undefined = parentStep.branches.find(
          (x) => x.optionId == request.branchNodeId,
        );

        if (branch) {
          branch.nextAction = createAction(request.action, {
            nextAction: branch.nextAction,
          });
        } else {
          const branch: SplitBranch = {
            optionId: request.branchNodeId,
            nextAction: createAction(request.action, {
              nextAction: undefined,
            }),
          };
          parentStep.branches.push(branch);
        }
      } else {
        throw new ApplicationError(
          {
            code: ErrorCode.FLOW_OPERATION_INVALID,
            params: {},
          },
          `Split step parent ${request.stepLocationRelativeToParent} not found`,
        );
      }
    } else {
      parentStep.nextAction = createAction(request.action, {
        nextAction: parentStep.nextAction,
      });
    }
    return parentStep;
  });
}

function createAction(
  request: UpdateActionRequest,
  {
    nextAction,
    onFailureAction,
    onSuccessAction,
    firstLoopAction,
    branches,
  }: {
    nextAction?: Action;
    firstLoopAction?: Action;
    onSuccessAction?: Action;
    onFailureAction?: Action;
    branches?: { optionId: string; nextAction?: Action }[];
  },
): Action {
  const baseProperties = {
    displayName: request.displayName,
    name: request.name,
    valid: false,
    nextAction,
  };
  let action: Action;
  switch (request.type) {
    case ActionType.BRANCH:
      action = {
        ...baseProperties,
        onFailureAction,
        onSuccessAction,
        type: ActionType.BRANCH,
        settings: request.settings,
      };
      break;
    case ActionType.SPLIT:
      action = {
        ...baseProperties,
        type: ActionType.SPLIT,
        settings: request.settings,
        branches: branches || getSplitBranches(request),
      };
      break;
    case ActionType.LOOP_ON_ITEMS:
      action = {
        ...baseProperties,
        firstLoopAction,
        type: ActionType.LOOP_ON_ITEMS,
        settings: request.settings,
      };
      break;
    case ActionType.BLOCK:
      action = {
        ...baseProperties,
        type: ActionType.BLOCK,
        settings: request.settings,
      };
      break;
    case ActionType.CODE:
      action = {
        ...baseProperties,
        type: ActionType.CODE,
        settings: request.settings,
      };
      break;
  }
  return {
    ...action,
    valid:
      (isNil(request.valid) ? true : request.valid) &&
      actionSchemaValidator.Check(action),
  };
}

function isChildOf(
  parent: LoopOnItemsAction | BranchAction | SplitAction,
  childStepName: string,
): boolean {
  const children = getAllChildSteps(parent);
  return children.findIndex((c) => c.name === childStepName) > -1;
}

function createTrigger(
  name: string,
  request: UpdateTriggerRequest,
  nextAction: Action | undefined,
): Trigger {
  const baseProperties = {
    displayName: request.displayName,
    name,
    valid: false,
    nextAction,
  };
  let trigger: Trigger;
  switch (request.type) {
    case TriggerType.EMPTY:
      trigger = {
        ...baseProperties,
        type: TriggerType.EMPTY,
        settings: request.settings,
      };
      break;
    case TriggerType.BLOCK:
      trigger = {
        ...baseProperties,
        type: TriggerType.BLOCK,
        settings: request.settings,
      };
      break;
  }
  return {
    ...trigger,
    valid:
      (isNil(request.valid) ? true : request.valid) &&
      triggerSchemaValidation.Check(trigger),
  };
}

const prefillConnection = (
  action: Action,
  connections?: AppConnectionWithoutSensitiveData[],
): Action => {
  if (
    Array.isArray(connections) &&
    connections.length > 0 &&
    'blockName' in action.settings
  ) {
    const blockName = action.settings.blockName;
    const connection = connections.find((c) => c.blockName === blockName);

    if (connection && 'input' in action.settings) {
      action.settings.input['auth'] = addConnectionBrackets(connection.name);
    }
  }

  return action;
};

export function getImportOperations(
  step: Action | Trigger | undefined,
  connections?: AppConnectionWithoutSensitiveData[],
): FlowOperationRequest[] {
  const operations: FlowOperationRequest[] = [];

  const createAddActionRequest = (action: Action): Action =>
    prefillConnection(removeAnySubsequentAction(action), connections);

  while (step) {
    if (step.nextAction) {
      operations.push({
        type: FlowOperationType.ADD_ACTION,
        request: {
          parentStep: step.name,
          action: createAddActionRequest(step.nextAction),
        },
      });
    }
    switch (step.type) {
      case ActionType.BRANCH: {
        if (step.onFailureAction) {
          operations.push({
            type: FlowOperationType.ADD_ACTION,
            request: {
              parentStep: step.name,
              stepLocationRelativeToParent:
                StepLocationRelativeToParent.INSIDE_FALSE_BRANCH,
              action: createAddActionRequest(step.onFailureAction),
            },
          });
          operations.push(
            ...getImportOperations(step.onFailureAction, connections),
          );
        }
        if (step.onSuccessAction) {
          operations.push({
            type: FlowOperationType.ADD_ACTION,
            request: {
              parentStep: step.name,
              stepLocationRelativeToParent:
                StepLocationRelativeToParent.INSIDE_TRUE_BRANCH,
              action: createAddActionRequest(step.onSuccessAction),
            },
          });
          operations.push(
            ...getImportOperations(step.onSuccessAction, connections),
          );
        }
        break;
      }
      case ActionType.SPLIT: {
        if (step.branches) {
          step.branches.forEach((branch) => {
            if (branch.nextAction) {
              operations.push({
                type: FlowOperationType.ADD_ACTION,
                request: {
                  parentStep: step!.name,
                  stepLocationRelativeToParent:
                    StepLocationRelativeToParent.INSIDE_SPLIT,
                  action: createAddActionRequest(branch.nextAction),
                  branchNodeId: branch.optionId,
                },
              });
              operations.push(
                ...getImportOperations(branch.nextAction, connections),
              );
            }
          });
        }
        break;
      }
      case ActionType.LOOP_ON_ITEMS: {
        if (step.firstLoopAction) {
          operations.push({
            type: FlowOperationType.ADD_ACTION,
            request: {
              parentStep: step.name,
              stepLocationRelativeToParent:
                StepLocationRelativeToParent.INSIDE_LOOP,
              action: createAddActionRequest(step.firstLoopAction),
            },
          });
          operations.push(
            ...getImportOperations(step.firstLoopAction, connections),
          );
        }
        break;
      }
      case ActionType.CODE:
      case ActionType.BLOCK:
      case TriggerType.BLOCK:
      case TriggerType.EMPTY: {
        break;
      }
    }

    step = step.nextAction;
  }
  return operations;
}

function removeAnySubsequentAction(action: Action): Action {
  const clonedAction: Action = JSON.parse(JSON.stringify(action));
  switch (clonedAction.type) {
    case ActionType.BRANCH: {
      delete clonedAction.onSuccessAction;
      delete clonedAction.onFailureAction;
      break;
    }
    case ActionType.SPLIT: {
      if (clonedAction.branches) {
        clonedAction.branches = [];
      }
      break;
    }
    case ActionType.LOOP_ON_ITEMS: {
      delete clonedAction.firstLoopAction;
      break;
    }
    case ActionType.BLOCK:
    case ActionType.CODE:
      break;
  }
  delete clonedAction.nextAction;
  return clonedAction;
}

function normalize(flowVersion: FlowVersion): FlowVersion {
  return transferFlow(flowVersion, (step) => {
    const clonedStep: Step = JSON.parse(JSON.stringify(step));
    clonedStep.settings.inputUiInfo = DEFAULT_SAMPLE_DATA_SETTINGS;
    if (
      clonedStep?.settings?.input?.auth &&
      [ActionType.BLOCK, TriggerType.BLOCK].includes(step.type)
    ) {
      clonedStep.settings.input.auth = '';
    }
    return upgradeBlock(clonedStep, clonedStep.name);
  });
}

function upgradeBlock(step: Step, stepName: string): Step {
  if (step.name !== stepName) {
    return step;
  }
  const clonedStep: Step = JSON.parse(JSON.stringify(step));
  switch (step.type) {
    case ActionType.BLOCK:
    case TriggerType.BLOCK: {
      const { blockVersion } = step.settings;
      if (blockVersion.startsWith('^') || blockVersion.startsWith('~')) {
        return step;
      }
      if (semver.valid(blockVersion) && semver.lt(blockVersion, '1.0.0')) {
        clonedStep.settings.blockVersion = `~${blockVersion}`;
      } else {
        clonedStep.settings.blockVersion = `^${blockVersion}`;
      }
      break;
    }
    default:
      break;
  }
  return clonedStep;
}

function isPartOfInnerFlow({
  parentStep,
  childName,
}: {
  parentStep: Action | Trigger;
  childName: string;
}): boolean {
  const steps = getAllSteps({
    ...parentStep,
    nextAction: undefined,
  });
  return steps.some((step) => step.name === childName);
}

function duplicateStep(
  stepName: string,
  flowVersionWithArtifacts: FlowVersion,
): FlowVersion {
  const clonedStep = JSON.parse(
    JSON.stringify(flowHelper.getStep(flowVersionWithArtifacts, stepName)),
  );

  clonedStep.nextAction = undefined;
  if (!clonedStep) {
    throw new Error(`step with name '${stepName}' not found`);
  }

  return duplicateStepCascading(
    clonedStep,
    flowVersionWithArtifacts,
    stepName,
    StepLocationRelativeToParent.AFTER,
  );
}

function duplicateStepCascading(
  action: Action | Step,
  flowVersion: FlowVersion,
  parentStep: string,
  stepLocationRelativeToParent: StepLocationRelativeToParent,
  branchNodeId?: string,
): FlowVersion {
  const existingNames = getAllSteps(flowVersion.trigger).map(
    (step) => step.name,
  );
  const oldStepsNameToReplace = getAllSteps(action).map((step) => step.name);
  const oldNameToNewName: Record<string, string> = {};

  oldStepsNameToReplace.forEach((name) => {
    const newName = findUnusedName(existingNames, 'step');
    oldNameToNewName[name] = newName;
    existingNames.push(newName);
  });

  const duplicatedStep = transferStep(action, (step: Step) => {
    step.displayName = `${step.displayName} Copy`;
    step.name = oldNameToNewName[step.name];
    clearStepTestData(step);
    oldStepsNameToReplace.forEach((oldName) => {
      step.settings.input = applyFunctionToValuesSync(
        step.settings.input,
        (value: unknown) => {
          if (isString(value)) {
            return replaceOldStepNameWithNewOne({
              input: value,
              oldStepName: oldName,
              newStepName: oldNameToNewName[oldName],
            });
          }
          return value;
        },
      );
    });
    return step;
  });
  let finalFlow = addAction(flowVersion, {
    action: duplicatedStep as Action,
    parentStep,
    stepLocationRelativeToParent,
    branchNodeId,
  });
  const operations = getImportOperations(duplicatedStep);
  operations.forEach((operation) => {
    finalFlow = flowHelper.apply(finalFlow, operation);
  });
  return finalFlow;
}
function replaceOldStepNameWithNewOne({
  input,
  oldStepName,
  newStepName,
}: {
  input: string;
  oldStepName: string;
  newStepName: string;
}): string {
  const regex = /{{(.*?)}}/g; // Regular expression to match strings inside {{ }}
  return input.replace(regex, (match, content) => {
    // Replace the content inside {{ }} using the provided function
    const replacedContent = content.replaceAll(
      new RegExp(`\\b${oldStepName}\\b`, 'g'),
      `${newStepName}`,
    );

    // Reconstruct the {{ }} with the replaced content
    return `{{${replacedContent}}}`;
  });
}

function doesActionHaveChildren(
  action: Action | Trigger,
): action is LoopOnItemsAction | BranchAction | SplitAction {
  if (
    action.type === ActionType.BRANCH ||
    action.type === ActionType.LOOP_ON_ITEMS ||
    action.type === ActionType.SPLIT
  ) {
    return true;
  }
  return false;
}

function findUnusedName(names: string[], stepPrefix: string): string {
  let availableNumber = 1;
  let availableName = `${stepPrefix}_${availableNumber}`;

  while (names.includes(availableName)) {
    availableNumber++;
    availableName = `${stepPrefix}_${availableNumber}`;
  }

  return availableName;
}

function findAvailableStepName(
  flowVersion: FlowVersion,
  stepPrefix: string,
): string {
  const steps = flowHelper.getAllSteps(flowVersion.trigger).map((f) => f.name);
  return findUnusedName(steps, stepPrefix);
}

type StepWithIndex = Step & { dfsIndex: number };

function findPathToStep({
  targetStepName,
  trigger,
}: {
  targetStepName: string;
  trigger: Trigger;
}): StepWithIndex[] {
  const steps = getAllSteps(trigger).map((step, dfsIndex) => ({
    ...step,
    dfsIndex,
  }));
  return steps
    .filter((step) => {
      const steps = getAllSteps(step);
      return steps.some((s) => s.name === targetStepName);
    })
    .filter((step) => step.name !== targetStepName);
}

const removeConnection = (step: Step): Step => {
  if (step?.settings?.input?.auth) {
    step.settings.input.auth = '';
  }
  return step;
};

export const flowHelper = {
  isValid,
  apply(
    flowVersion: FlowVersion,
    operation: FlowOperationRequest,
  ): FlowVersion {
    let clonedVersion: FlowVersion = JSON.parse(JSON.stringify(flowVersion));
    switch (operation.type) {
      case FlowOperationType.MOVE_ACTION:
        clonedVersion = moveAction(clonedVersion, operation.request);
        break;
      case FlowOperationType.LOCK_FLOW:
        clonedVersion.state = FlowVersionState.LOCKED;
        break;
      case FlowOperationType.CHANGE_NAME:
        clonedVersion.displayName = operation.request.displayName;
        break;
      case FlowOperationType.DELETE_ACTION:
        clonedVersion = deleteAction(clonedVersion, operation.request);
        break;
      case FlowOperationType.ADD_ACTION: {
        clonedVersion = transferFlow(
          addAction(clonedVersion, operation.request),
          (step) => upgradeBlock(step, operation.request.action.name),
        );
        break;
      }
      case FlowOperationType.PASTE_ACTIONS: {
        clonedVersion = transferFlow(
          bulkAddActions(clonedVersion, operation.request),
          (step) => upgradeBlock(step, operation.request.action.name),
        );
        break;
      }
      case FlowOperationType.UPDATE_ACTION:
        clonedVersion = transferFlow(
          updateAction(clonedVersion, operation.request),
          (step) => upgradeBlock(step, operation.request.name),
        );
        break;
      case FlowOperationType.UPDATE_TRIGGER:
        clonedVersion.trigger = createTrigger(
          clonedVersion.trigger.name,
          operation.request,
          clonedVersion.trigger.nextAction,
        );
        clonedVersion = transferFlow(clonedVersion, (step) =>
          upgradeBlock(step, operation.request.name),
        );
        break;
      case FlowOperationType.DUPLICATE_ACTION: {
        clonedVersion = duplicateStep(
          operation.request.stepName,
          clonedVersion,
        );
        break;
      }
      case FlowOperationType.CHANGE_DESCRIPTION:
        clonedVersion.description = operation.request.description;
        break;
      case FlowOperationType.REMOVE_CONNECTIONS:
        clonedVersion = transferFlow(clonedVersion, (step) =>
          removeConnection(step),
        );
        break;
      default:
        break;
    }
    clonedVersion.valid = isValid(clonedVersion);
    return clonedVersion;
  },

  getStep,
  isAction,
  isTrigger,
  getAllSteps,
  isPartOfInnerFlow,
  getUsedBlocks,
  getImportOperations,
  normalize,
  getStepFromSubFlow,
  isChildOf,
  transferFlowAsync,
  getAllChildSteps,
  getAllStepsAtFirstLevel,
  duplicateStep,
  findAvailableStepName,
  doesActionHaveChildren,
  findPathToStep,
  truncateFlow,
  clearStepTestData,
};
