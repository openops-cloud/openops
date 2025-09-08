import { Store } from '@openops/blocks-framework';
import {
  Action,
  ActionType,
  LoopStepResult,
} from '@openops/shared';
import { EngineConstants } from './context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
  VerdictReason,
} from './context/flow-execution-context';
import { flowExecutor } from './flow-executor';

export async function resumePausedIterationOldStrategy(
  payload: { executionCorrelationId: string; path: string },
  loopExecutionState: FlowExecutorContext,
  numberOfIterations: number,
  constants: EngineConstants,
  firstLoopAction: Action,
  actionName: string,
  store: Store,
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

  newExecutionContext = newExecutionContext.setCurrentPath(
    newExecutionContext.currentPath.removeLast(),
  );

  return generateNextFlowContext(
    store,
    newExecutionContext,
    numberOfIterations,
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
    reason: VerdictReason.PAUSED,
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

type IterationResult = {
  // Iteration input
  item: unknown;
  // Iteration index, starts at 1
  index: number;
  // Iteration state
  isPaused: boolean;
};
