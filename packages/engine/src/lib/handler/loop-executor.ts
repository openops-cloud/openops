import { Store } from '@openops/blocks-framework';
import {
  Action,
  ActionType,
  FlowRunStatus,
  isNil,
  LoopOnItemsAction,
  LoopStepOutput,
  LoopStepResult,
  StepOutput,
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

    const { resolvedInput, censoredInput } =
      await constants.variableService.resolve<LoopOnActionResolvedSettings>({
        unresolvedInput: {
          items: action.settings.items,
        },
        executionState,
      });

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
      if (payload && !payload.path?.includes(action.name)) {
        return executionState;
      }
    } else {
      const loopIterations = triggerLoopIterations(
        resolvedInput,
        executionState,
        stepOutput,
        constants,
        action,
        firstLoopAction,
      );

      if (loopIterations.length === 0) {
        return executionState.upsertStep(action.name, stepOutput);
      }

      return waitForIterationsToFinishOrPause(
        loopIterations,
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

function triggerLoopIterations(
  resolvedInput: LoopOnActionResolvedSettings,
  loopExecutionState: FlowExecutorContext,
  stepOutput: LoopStepOutput,
  constants: EngineConstants,
  action: LoopOnItemsAction,
  firstLoopAction: Action,
): Promise<FlowExecutorContext>[] {
  const loopIterations: Promise<FlowExecutorContext>[] = [];

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
    const newExecutionContext = loopExecutionState
      .upsertStep(action.name, stepOutput)
      .setCurrentPath(newCurrentPath)
      .setPauseId(newId);

    const executionContextCopy = cloneDeep(newExecutionContext);
    loopIterations[i] = flowExecutor.execute({
      executionState: executionContextCopy,
      action: firstLoopAction,
      constants,
    });
  }

  return loopIterations;
}

async function waitForIterationsToFinishOrPause(
  loopIterations: Promise<FlowExecutorContext>[],
  actionName: string,
  store: Store,
): Promise<FlowExecutorContext> {
  const iterationResults: {
    iterationContext: FlowExecutorContext;
    isPaused: boolean;
  }[] = [];
  let noPausedIterations = true;

  for (const iteration of loopIterations) {
    const iterationContext = await iteration;
    const { verdict, verdictResponse } = iterationContext;

    if (verdict === ExecutionVerdict.FAILED) {
      return iterationContext.setCurrentPath(
        iterationContext.currentPath.removeLast(),
      );
    }

    const isPaused =
      verdict === ExecutionVerdict.PAUSED &&
      verdictResponse?.reason === FlowRunStatus.PAUSED;

    if (isPaused) {
      noPausedIterations = false;
    }

    iterationResults.push({ iterationContext, isPaused });
  }

  const { iterationContext: lastIterationContext } =
    iterationResults[iterationResults.length - 1];

  populateLastIterationContext(lastIterationContext, iterationResults);

  const executionState = lastIterationContext.setCurrentPath(
    lastIterationContext.currentPath.removeLast(),
  );

  await saveIterationResults(store, actionName, iterationResults);
  if (noPausedIterations) {
    return executionState;
  }

  return pauseLoop(executionState);
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

  newExecutionContext = await flowExecutor.execute({
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

  const executionState = newExecutionContext.setCurrentPath(
    newExecutionContext.currentPath.removeLast(),
  );

  return executionState;
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

function populateLastIterationContext(
  lastIterationContext: FlowExecutorContext,
  iterationResults: {
    iterationContext: FlowExecutorContext;
    isPaused: boolean;
  }[],
): void {
  const loopStepResult = getLoopStepResult(lastIterationContext);
  for (let i = 0; i < iterationResults.length - 1; ++i) {
    const iteration = getIterationOutput(iterationResults[i].iterationContext);

    loopStepResult.iterations[i] = iteration;
  }
}

function getIterationOutput(
  lastIterationContext: FlowExecutorContext,
): Readonly<Record<string, StepOutput>> {
  let targetMap = lastIterationContext.steps;
  lastIterationContext.currentPath.path.forEach(([stepName, iteration]) => {
    const stepOutput = targetMap[stepName];
    if (!stepOutput.output || stepOutput.type !== ActionType.LOOP_ON_ITEMS) {
      throw new Error(
        '[ExecutionState#getTargetMap] Not instance of Loop On Items step output',
      );
    }
    targetMap = stepOutput.output.iterations[iteration];
  });

  return targetMap;
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

type IterationResult = {
  // Iteration input
  item: unknown;
  // Iteration index, starts at 1
  index: number;
  // Iteration state
  isPaused: boolean;
};
