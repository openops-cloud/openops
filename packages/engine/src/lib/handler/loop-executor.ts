import { Store } from '@openops/blocks-framework';
import {
  Action,
  ActionType,
  FlowRunStatus,
  isEmpty,
  isNil,
  isString,
  LoopOnItemsAction,
  LoopStepOutput,
  LoopStepResult,
} from '@openops/shared';
import cloneDeep from 'lodash.clonedeep';
import { nanoid } from 'nanoid';
import { createContextStore } from '../services/storage.service';
import { BaseExecutor } from './base-executor';
import { EngineConstants } from './context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
} from './context/flow-execution-context';
import { flowExecutor } from './flow-executor';

type LoopOnActionResolvedSettings = {
  items: readonly unknown[];
};

type LoopExecutionContext = {
  executionState: FlowExecutorContext;
  iterations: FlowExecutorContext[];
};

export const loopExecutor: BaseExecutor<LoopOnItemsAction> = {
  async handle({
    action,
    executionState,
    constants,
  }: {
    action: LoopOnItemsAction;
    executionState: FlowExecutorContext;
    constants: EngineConstants;
  }) {
    const payload = constants.resumePayload?.queryParams as {
      executionCorrelationId: string;
      path: string;
    };

    const {
      resolvedInput,
      censoredInput,
    }: {
      resolvedInput: LoopOnActionResolvedSettings;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      censoredInput: any;
    } = await constants.variableService.resolve<LoopOnActionResolvedSettings>({
      unresolvedInput: {
        items: action.settings.items,
      },
      executionState,
    });

    resolvedInput.items = processItems(resolvedInput.items);
    censoredInput.items = processItems(censoredInput.items);

    let stepOutput = LoopStepOutput.init({
      input: censoredInput,
    });

    let pathPrefix = `${action.name}`;
    if (executionState.currentPath.path.length > 0) {
      pathPrefix = `${executionState.currentPath.path.join('.')}_${pathPrefix}`;
    }

    const store = createContextStore({
      apiUrl: constants.internalApiUrl,
      prefix: `Loop_${constants.flowRunId}_${pathPrefix}`,
      flowId: constants.flowId,
      flowRunId: constants.flowRunId,
      engineToken: constants.engineToken,
    });

    const firstLoopAction = action.firstLoopAction;

    if (isNil(firstLoopAction) || constants.testSingleStepMode) {
      stepOutput = stepOutput.setItemAndIndex({
        index: 1,
        item: resolvedInput.items[0],
      });

      return executionState.upsertStep(action.name, stepOutput);
    }

    const isCompleted = executionState.isCompleted({ stepName: action.name });
    if (isCompleted) {
      if (payload && !pathContainsAction(action.name, payload.path)) {
        return executionState;
      }
    } else {
      const loopExecutionContext: LoopExecutionContext = {
        executionState,
        iterations: [],
      };

      await triggerLoopIterations(
        resolvedInput,
        loopExecutionContext,
        stepOutput,
        constants,
        action,
        firstLoopAction,
      );

      if (loopExecutionContext.iterations.length === 0) {
        return executionState.upsertStep(action.name, stepOutput);
      }

      return waitForIterationsToFinishOrPause(
        loopExecutionContext,
        action.name,
        store,
      );
    }

    executionState = await resumePausedIteration(
      store,
      payload,
      executionState,
      constants,
      firstLoopAction,
      action.name,
    );

    const numberOfIterations = resolvedInput.items.length;

    return generateNextFlowContext(store, executionState, numberOfIterations);
  },
};

function processItems(items: readonly unknown[]): readonly unknown[] {
  if (isEmpty(items)) {
    return [];
  }

  if (isString(items)) {
    items = JSON.parse(items);
  }

  if (!Array.isArray(items)) {
    items = [items];
  }

  return items;
}

async function triggerLoopIterations(
  resolvedInput: LoopOnActionResolvedSettings,
  loopExecutionContext: LoopExecutionContext,
  stepOutput: LoopStepOutput,
  constants: EngineConstants,
  action: LoopOnItemsAction,
  firstLoopAction: Action,
): Promise<void> {
  let loopExecutionState = loopExecutionContext.executionState;
  const loopIterations = loopExecutionContext.iterations;
  const originalPauseId = loopExecutionState.pauseId;

  for (let i = 0; i < resolvedInput.items.length; ++i) {
    const newCurrentPath = loopExecutionState.currentPath.loopIteration({
      loopName: action.name,
      iteration: i,
    });
    stepOutput = stepOutput.setItemAndIndex({
      index: i + 1,
      item: resolvedInput.items[i],
    });

    const addEmptyIteration = !stepOutput.hasIteration(i);
    if (addEmptyIteration) {
      stepOutput = stepOutput.addIteration();
    }

    // Generate new pauseId for each iteration
    const newId = nanoid();
    loopExecutionState = loopExecutionState
      .upsertStep(action.name, stepOutput)
      .setCurrentPath(newCurrentPath)
      .setPauseId(newId);

    loopExecutionState = await flowExecutor.executeFromAction({
      executionState: loopExecutionState,
      action: firstLoopAction,
      constants,
    });

    loopIterations[i] = cloneDeep(loopExecutionState);
    loopExecutionState = loopExecutionState
      .setVerdict(ExecutionVerdict.RUNNING)
      .setCurrentPath(loopExecutionState.currentPath.removeLast())
      .setPauseId(originalPauseId);
  }

  loopExecutionContext.executionState = loopExecutionState;
}

async function waitForIterationsToFinishOrPause(
  loopExecutionContext: LoopExecutionContext,
  actionName: string,
  store: Store,
): Promise<FlowExecutorContext> {
  const iterationResults: {
    iterationContext: FlowExecutorContext;
    isPaused: boolean;
  }[] = [];
  let noPausedIterations = true;
  let executionFailed = false;

  for (const iterationContext of loopExecutionContext.iterations) {
    const { verdict, verdictResponse } = iterationContext;

    if (verdict === ExecutionVerdict.FAILED) {
      executionFailed = true;
    }

    const isPaused =
      verdict === ExecutionVerdict.PAUSED &&
      verdictResponse?.reason === FlowRunStatus.PAUSED;

    if (isPaused) {
      noPausedIterations = false;
    }

    iterationResults.push({ iterationContext, isPaused });
  }

  await saveIterationResults(store, actionName, iterationResults);
  if (executionFailed) {
    return loopExecutionContext.executionState.setVerdict(
      ExecutionVerdict.FAILED,
    );
  }

  if (noPausedIterations) {
    return loopExecutionContext.executionState;
  }

  return pauseLoop(loopExecutionContext.executionState);
}

async function saveIterationResults(
  store: Store,
  actionName: string,
  iterationResults: {
    iterationContext: FlowExecutorContext;
    isPaused: boolean;
  }[],
): Promise<void> {
  for (let i = 0; i < iterationResults.length; ++i) {
    const { iterationContext, isPaused } = iterationResults[i];

    const iterationOutput = iterationContext.currentState()[
      actionName
    ] as LoopStepResult;
    if (isPaused) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await store.put(iterationContext.currentPath.toString(), i);
    }

    await storeIterationResult(
      `${i}`,
      isPaused,
      iterationOutput.index,
      iterationOutput.item,
      store,
    );
  }
}

async function resumePausedIteration(
  store: Store,
  payload: { executionCorrelationId: string; path: string },
  loopExecutionState: FlowExecutorContext,
  constants: EngineConstants,
  firstLoopAction: Action,
  actionName: string,
): Promise<FlowExecutorContext> {
  // Get which iteration is being resumed
  const iterationKey = await getIterationKey(store, actionName, payload.path);

  const previousIterationResult = (await store.get(
    iterationKey,
  )) as IterationResult;

  const newCurrentPath = loopExecutionState.currentPath.loopIteration({
    loopName: actionName,
    iteration: previousIterationResult.index - 1,
  });
  let newExecutionContext = loopExecutionState.setCurrentPath(newCurrentPath);

  const loopStepResult = getLoopStepResult(newExecutionContext);
  loopStepResult.index = Number(previousIterationResult.index);
  loopStepResult.item = previousIterationResult.item;

  newExecutionContext = await flowExecutor.executeFromAction({
    executionState: newExecutionContext,
    action: firstLoopAction,
    constants,
  });

  const isPaused = newExecutionContext.verdict === ExecutionVerdict.PAUSED;

  await storeIterationResult(
    iterationKey,
    isPaused,
    previousIterationResult.index,
    previousIterationResult.item,
    store,
  );

  return newExecutionContext.setCurrentPath(
    newExecutionContext.currentPath.removeLast(),
  );
}

async function storeIterationResult(
  key: string,
  isPaused: boolean,
  iterationIndex: number,
  iterationItem: unknown,
  store: Store,
): Promise<void> {
  const iterationResult: IterationResult = {
    isPaused,
    index: iterationIndex,
    item: iterationItem,
  };

  await store.put(key, iterationResult);
}

async function generateNextFlowContext(
  store: Store,
  loopExecutionState: FlowExecutorContext,
  numberOfIterations: number,
): Promise<FlowExecutorContext> {
  let areAllStepsInLoopFinished = true;

  for (
    let iterationIndex = 0;
    iterationIndex < numberOfIterations;
    ++iterationIndex
  ) {
    const iterationResult: IterationResult | null = await store.get(
      `${iterationIndex}`,
    );

    if (!iterationResult || iterationResult.isPaused) {
      areAllStepsInLoopFinished = false;
      break;
    }
  }

  return areAllStepsInLoopFinished
    ? loopExecutionState
    : pauseLoop(loopExecutionState);
}

function pauseLoop(executionState: FlowExecutorContext): FlowExecutorContext {
  return executionState.setVerdict(ExecutionVerdict.PAUSED, {
    reason: FlowRunStatus.PAUSED,
    pauseMetadata: {
      executionCorrelationId: executionState.pauseId,
    },
  });
}

function getLoopStepResult(
  lastIterationContext: FlowExecutorContext,
): LoopStepResult {
  let targetMap = lastIterationContext.steps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let loopStepResult: any = undefined;
  lastIterationContext.currentPath.path.forEach(([stepName, iteration]) => {
    const stepOutput = targetMap[stepName];
    if (!stepOutput.output || stepOutput.type !== ActionType.LOOP_ON_ITEMS) {
      throw new Error(
        '[ExecutionState#getTargetMap] Not instance of Loop On Items step output',
      );
    }
    targetMap = stepOutput.output.iterations[iteration];
    loopStepResult = stepOutput.output;
  });

  return loopStepResult;
}

function buildPathKeyFromPayload(input: string, target: string): string {
  const parts = input.split(',');
  const filteredParts = [];

  for (let i = 0; i < parts.length; i += 2) {
    filteredParts.push(`${parts[i]},${parts[i + 1]}`);

    if (parts[i] === target) {
      break;
    }
  }

  // "step_name,iteration.step_name,iteration"
  return filteredParts.join('.');
}

async function getIterationKey(
  store: Store,
  actionName: string,
  payloadPath: string,
): Promise<string> {
  let iterationKey = (await store.get(payloadPath)) as string;

  if (!iterationKey) {
    const path = buildPathKeyFromPayload(payloadPath, actionName);
    iterationKey = (await store.get(path)) as string;
  }
  return iterationKey;
}

function pathContainsAction(actionName: string, path: string): boolean {
  if (!path) {
    return false;
  }

  const regex = new RegExp(`\\b${actionName}\\b`);
  return regex.test(path);
}

type IterationResult = {
  // Iteration input
  item: unknown;
  // Iteration index, starts at 1
  index: number;
  // Iteration state
  isPaused: boolean;
};
