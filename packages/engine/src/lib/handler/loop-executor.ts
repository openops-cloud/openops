import { Store } from '@openops/blocks-framework';
import {
  Action,
  ActionType,
  FlowRunId,
  FlowRunStatus,
  isEmpty,
  isNil,
  isString,
  LoopOnItemsAction,
  LoopStepOutput,
  LoopStepResult,
} from '@openops/shared';
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

type IterationContext = {
  index: number;
  isPaused: boolean;
  currentPath: string;
  verdict: ExecutionVerdict;
};

type LoopExecutionContext = {
  executionState: FlowExecutorContext;
  iterations: IterationContext[];
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

      const { executionFailed, noPausedIterations } =
        await saveIterationResults(
          loopExecutionContext,
          constants.flowRunId,
          store,
        );

      return setExecutionVerdict(
        loopExecutionContext.executionState,
        noPausedIterations,
        executionFailed,
      );
    }

    return resumePausedIteration(
      store,
      payload,
      resolvedInput,
      executionState,
      constants,
      firstLoopAction,
      action.name,
    );
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
    const loopIndex = i + 1;
    stepOutput = stepOutput.setItemAndIndex({
      index: loopIndex,
      item: resolvedInput.items[i],
    });

    const addEmptyIteration = !stepOutput.hasIteration(i);
    if (addEmptyIteration) {
      stepOutput = stepOutput.addIteration();
    }

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

    const isPaused =
      loopExecutionState.verdict === ExecutionVerdict.PAUSED &&
      loopExecutionState.verdictResponse?.reason === FlowRunStatus.PAUSED;

    loopIterations[i] = {
      isPaused,
      index: loopIndex,
      verdict: loopExecutionState.verdict,
      currentPath: loopExecutionState.currentPath.toString(),
    };

    loopExecutionState = loopExecutionState
      .setVerdict(ExecutionVerdict.RUNNING)
      .setCurrentPath(loopExecutionState.currentPath.removeLast())
      .setPauseId(originalPauseId);
  }

  loopExecutionContext.executionState = loopExecutionState;
}

async function saveIterationResults(
  loopExecutionContext: LoopExecutionContext,
  flowRunId: FlowRunId,
  store: Store,
): Promise<{ executionFailed: boolean; noPausedIterations: boolean }> {
  let noPausedIterations = true;
  let executionFailed = false;

  const iterationsMapping: Record<string, IterationResult> = {};
  for (let i = 0; i < loopExecutionContext.iterations.length; ++i) {
    const { index, verdict, currentPath, isPaused } =
      loopExecutionContext.iterations[i];

    if (verdict === ExecutionVerdict.FAILED) {
      executionFailed = true;
    }

    if (isPaused) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      noPausedIterations = false;
    }

    iterationsMapping[currentPath] = {
      isPaused,
      index,
    };
  }

  await storeLoopIterationsMapping(flowRunId, store, iterationsMapping);
  return { executionFailed, noPausedIterations };
}

function setExecutionVerdict(
  executionState: FlowExecutorContext,
  noPausedIterations: boolean,
  executionFailed: boolean,
): FlowExecutorContext {
  if (executionFailed) {
    return executionState.setVerdict(ExecutionVerdict.FAILED);
  }

  if (noPausedIterations) {
    return executionState;
  }

  return pauseLoop(executionState);
}

async function resumePausedIteration(
  store: Store,
  payload: { executionCorrelationId: string; path: string },
  resolvedInput: LoopOnActionResolvedSettings,
  loopExecutionState: FlowExecutorContext,
  constants: EngineConstants,
  firstLoopAction: Action,
  actionName: string,
): Promise<FlowExecutorContext> {
  const flowRunId = constants.flowRunId;
  const iterationsMapping = await getLoopIterationsMapping(store, flowRunId);

  const previousIterationResult = iterationsMapping[payload.path];
  const newCurrentPath = loopExecutionState.currentPath.loopIteration({
    loopName: actionName,
    iteration: previousIterationResult.index - 1,
  });
  let newExecutionContext = loopExecutionState.setCurrentPath(newCurrentPath);

  const loopStepResult = getLoopStepResult(newExecutionContext);
  loopStepResult.index = Number(previousIterationResult.index);
  loopStepResult.item = resolvedInput.items[previousIterationResult.index - 1];

  newExecutionContext = await flowExecutor.executeFromAction({
    executionState: newExecutionContext,
    action: firstLoopAction,
    constants,
  });

  const isPaused = newExecutionContext.verdict === ExecutionVerdict.PAUSED;

  iterationsMapping[payload.path] = {
    isPaused,
    index: previousIterationResult.index,
  };

  await storeLoopIterationsMapping(flowRunId, store, iterationsMapping);
  newExecutionContext = newExecutionContext.setCurrentPath(
    newExecutionContext.currentPath.removeLast(),
  );

  return areAllStepsInLoopFinished(iterationsMapping)
    ? newExecutionContext
    : pauseLoop(newExecutionContext);
}

function areAllStepsInLoopFinished(
  iterationsMapping: Record<string, IterationResult>,
): boolean {
  let areAllStepsInLoopFinished = true;
  for (const [_key, value] of Object.entries(iterationsMapping)) {
    if (!value || value.isPaused) {
      areAllStepsInLoopFinished = false;
      break;
    }
  }

  return areAllStepsInLoopFinished;
}

async function storeLoopIterationsMapping(
  key: string,
  store: Store,
  iterationsMapping: Record<string, IterationResult>,
): Promise<void> {
  await store.put(key, iterationsMapping);
}

async function getLoopIterationsMapping(
  store: Store,
  key: string,
): Promise<Record<string, IterationResult>> {
  const mapping = await store.get(key);

  if (!mapping) {
    throw new Error(`No iterations mapping found for run: ${key}`);
  }

  return mapping as Record<string, IterationResult>;
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

function pathContainsAction(actionName: string, path: string): boolean {
  if (!path) {
    return false;
  }

  const regex = new RegExp(`\\b${actionName}\\b`);
  return regex.test(path);
}

type IterationResult = {
  // Iteration index, starts at 1
  index: number;
  // Iteration state
  isPaused: boolean;
};
