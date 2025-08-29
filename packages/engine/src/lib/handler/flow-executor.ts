import { runWithTemporaryContext } from '@openops/server-shared';
import {
  Action,
  ActionType,
  FlowRunResponse,
  isNil,
  Trigger,
} from '@openops/shared';
import { performance } from 'node:perf_hooks';
import { progressService } from '../services/progress.service';
import { throwIfExecutionTimeExceeded } from '../timeout-validator';
import { BaseExecutor } from './base-executor';
import { blockExecutor } from './block-executor';
import { branchExecutor } from './branch-executor';
import { codeExecutor } from './code-executor';
import { EngineConstants } from './context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
} from './context/flow-execution-context';
import { loopExecutor } from './loop-executor';
import { splitExecutor } from './split-executor';

const executeFunction: Record<ActionType, BaseExecutor<Action>> = {
  [ActionType.CODE]: codeExecutor,
  [ActionType.BRANCH]: branchExecutor,
  [ActionType.LOOP_ON_ITEMS]: loopExecutor,
  [ActionType.BLOCK]: blockExecutor,
  [ActionType.SPLIT]: splitExecutor,
};

export const flowExecutor = {
  getExecutorForAction(type: ActionType): BaseExecutor<Action> {
    const executor = executeFunction[type];
    if (isNil(executor)) {
      throw new Error('Not implemented');
    }
    return executor;
  },
  async triggerFlowExecutor({
    trigger,
    constants,
    executionState,
  }: {
    trigger: Trigger;
    executionState: FlowExecutorContext;
    constants: EngineConstants;
  }): Promise<FlowRunResponse> {
    const output = await flowExecutor.executeFromAction({
      action: trigger.nextAction,
      executionState,
      constants,
    });

    const newContext =
      output.verdict === ExecutionVerdict.RUNNING
        ? output.setVerdict(ExecutionVerdict.SUCCEEDED, output.verdictResponse)
        : output;

    sendProgress(newContext, constants);

    return newContext.toResponse();
  },
  async executeFromAction({
    action,
    constants,
    executionState,
  }: {
    action: Action;
    executionState: FlowExecutorContext;
    constants: EngineConstants;
  }): Promise<FlowExecutorContext> {
    const flowStartTime = performance.now();
    let flowExecutionContext = executionState;
    let currentAction: Action | undefined = action;

    while (!isNil(currentAction)) {
      throwIfExecutionTimeExceeded();

      const handler = this.getExecutorForAction(currentAction.type);

      const stepStartTime = performance.now();

      const logContext = {
        actionType: currentAction.type,
      };

      flowExecutionContext = await runWithTemporaryContext(
        logContext,
        async () => {
          return handler.handle({
            action: currentAction as Action,
            executionState: flowExecutionContext,
            constants,
          });
        },
      );

      const stepEndTime = performance.now();

      flowExecutionContext = flowExecutionContext.setStepDuration({
        stepName: currentAction.name,
        duration: stepEndTime - stepStartTime,
      });

      sendProgress(flowExecutionContext, constants);

      if (flowExecutionContext.verdict !== ExecutionVerdict.RUNNING) {
        break;
      }

      currentAction = currentAction.nextAction;
    }

    const flowEndTime = performance.now();

    return flowExecutionContext.setDuration(flowEndTime - flowStartTime);
  },
};

function sendProgress(
  flowExecutionContext: FlowExecutorContext,
  constants: EngineConstants,
): void {
  if (isNil(constants.executionCorrelationId)) {
    return;
  }
  return progressService.sendUpdate({
    engineConstants: constants,
    flowExecutorContext: flowExecutionContext,
  });
}
