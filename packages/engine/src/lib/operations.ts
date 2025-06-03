import { appendToContext, logger } from '@openops/server-shared';
import {
  Action,
  ActionType,
  EngineOperation,
  EngineOperationType,
  EngineResponse,
  EngineResponseStatus,
  ExecuteActionResponse,
  ExecuteExtractBlockMetadata,
  ExecuteFlowOperation,
  ExecutePropsOptions,
  ExecuteStepOperation,
  ExecuteTriggerOperation,
  ExecuteValidateAuthOperation,
  ExecutionType,
  flowHelper,
  FlowRunResponse,
  GenericStepOutput,
  isNil,
  StepOutput,
  StepOutputStatus,
  TriggerHookType,
} from '@openops/shared';
import { EngineConstants } from './handler/context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
} from './handler/context/flow-execution-context';
import { testExecutionContext } from './handler/context/test-execution-context';
import { flowExecutor } from './handler/flow-executor';
import { blockHelper } from './helper/block-helper';
import { triggerHelper } from './helper/trigger-helper';
import { progressService } from './services/progress.service';
import { utils } from './utils';

const executeFlow = async (
  input: ExecuteFlowOperation,
  context: FlowExecutorContext,
): Promise<EngineResponse<Pick<FlowRunResponse, 'status' | 'error'>>> => {
  const constants = EngineConstants.fromExecuteFlowInput(input);
  const output = await flowExecutor.execute({
    action: input.flowVersion.trigger.nextAction,
    executionState: context,
    constants,
  });
  const newContext =
    output.verdict === ExecutionVerdict.RUNNING
      ? output.setVerdict(ExecutionVerdict.SUCCEEDED, output.verdictResponse)
      : output;
  await progressService.sendUpdate({
    engineConstants: constants,
    flowExecutorContext: newContext,
  });
  const response = await newContext.toResponse();
  return {
    status: EngineResponseStatus.OK,
    response: {
      status: response.status,
      error: response.error,
    },
  };
};

async function executeStep(
  input: ExecuteStepOperation,
): Promise<ExecuteActionResponse> {
  const step = flowHelper.getStep(input.flowVersion, input.stepName) as
    | Action
    | undefined;

  if (isNil(step) || !Object.values(ActionType).includes(step.type)) {
    throw new Error('Step not found or not supported');
  }

  const executor = flowExecutor.getExecutorForAction(step.type);

  appendToContext({
    actionType: step.type,
  });

  const output = await executor.handle({
    action: step,
    executionState: await testExecutionContext.stateFromFlowVersion({
      apiUrl: input.internalApiUrl,
      flowVersion: input.flowVersion,
      excludedStepName: step.name,
      projectId: input.projectId,
      engineToken: input.engineToken,
      stepTestOutputs: input.stepTestOutputs,
    }),
    constants: EngineConstants.fromExecuteStepInput(input),
  });

  return {
    success: output.verdict !== ExecutionVerdict.FAILED,
    output: cleanSampleData(output.steps[step.name]),
  };
}

function cleanSampleData(stepOutput: StepOutput): unknown {
  if (stepOutput.type === ActionType.LOOP_ON_ITEMS) {
    return {
      item: stepOutput.output?.item,
      index: stepOutput.output?.index,
    };
  }
  return stepOutput.errorMessage ?? stepOutput.output;
}

function getFlowExecutionState(
  input: ExecuteFlowOperation,
): FlowExecutorContext {
  switch (input.executionType) {
    case ExecutionType.BEGIN:
      return FlowExecutorContext.empty().upsertStep(
        input.flowVersion.trigger.name,
        GenericStepOutput.create({
          type: input.flowVersion.trigger.type,
          status: StepOutputStatus.SUCCEEDED,
          input: {},
        }).setOutput(input.triggerPayload),
      );
    case ExecutionType.RESUME: {
      let flowContext = FlowExecutorContext.empty().increaseTask(input.tasks);
      for (const [step, output] of Object.entries(input.steps)) {
        if (
          [StepOutputStatus.SUCCEEDED, StepOutputStatus.PAUSED].includes(
            output.status,
          )
        ) {
          flowContext = flowContext.upsertStep(step, output);
        }
      }
      return flowContext;
    }
  }
}

export async function execute(
  operationType: EngineOperationType,
  operation: EngineOperation,
): Promise<EngineResponse<unknown>> {
  try {
    switch (operationType) {
      case EngineOperationType.EXTRACT_BLOCK_METADATA: {
        const input = operation as ExecuteExtractBlockMetadata;

        appendToContext({
          blockName: input.blockName,
          blockType: input.blockType,
          blockVersion: input.blockVersion,
        });

        const output = await blockHelper.extractBlockMetadata({
          params: input,
          blocksSource: EngineConstants.BLOCK_SOURCES,
        });

        return {
          status: EngineResponseStatus.OK,
          response: output,
        };
      }
      case EngineOperationType.EXECUTE_FLOW: {
        const input = operation as ExecuteFlowOperation;

        appendToContext({
          projectId: input.projectId,
          flowRunId: input.flowRunId,
          flowId: input.flowVersion.flowId,
          flowVersionId: input.flowVersion.id,
        });

        const flowExecutorContext = getFlowExecutionState(input);
        const output = await executeFlow(input, flowExecutorContext);
        return output;
      }
      case EngineOperationType.EXECUTE_PROPERTY: {
        const input = operation as ExecutePropsOptions;

        appendToContext({
          projectId: input.projectId,
          blockName: input.block.blockName,
          blockType: input.block.blockType,
          blockVersion: input.block.blockVersion,
          propertyName: input.propertyName,
          flowId: input.flowVersion.flowId,
          flowVersionId: input.flowVersion.id,
        });

        const output = await blockHelper.executeProps({
          params: input,
          blocksSource: EngineConstants.BLOCK_SOURCES,
          executionState: await testExecutionContext.stateFromFlowVersion({
            apiUrl: input.internalApiUrl,
            flowVersion: input.flowVersion,
            projectId: input.projectId,
            engineToken: input.engineToken,
            stepTestOutputs: input.stepTestOutputs,
          }),
          searchValue: input.searchValue,
          constants: EngineConstants.fromExecutePropertyInput(input),
        });

        return {
          status: EngineResponseStatus.OK,
          response: output,
        };
      }
      case EngineOperationType.EXECUTE_TRIGGER_HOOK: {
        const input = operation as ExecuteTriggerOperation<TriggerHookType>;

        appendToContext({
          projectId: input.projectId,
          flowId: input.flowVersion.flowId,
          flowVersionId: input.flowVersion.id,
        });

        const output = await triggerHelper.executeTrigger({
          params: input,
          constants: EngineConstants.fromExecuteTriggerInput(input),
        });

        return {
          status: EngineResponseStatus.OK,
          response: output,
        };
      }
      case EngineOperationType.EXECUTE_STEP: {
        const input = operation as ExecuteStepOperation;

        appendToContext({
          flowVersionId: input.flowVersion.id,
          flowId: input.flowVersion.flowId,
          projectId: input.projectId,
          stepName: input.stepName,
        });

        const output = await executeStep(input);

        return {
          status: EngineResponseStatus.OK,
          response: output,
        };
      }
      case EngineOperationType.EXECUTE_VALIDATE_AUTH: {
        const input = operation as ExecuteValidateAuthOperation;

        appendToContext({
          authType: input.auth.type,
          projectId: input.projectId,
          blockName: input.block.blockName,
          blockType: input.block.blockType,
          blockVersion: input.block.blockVersion,
        });

        const output = await blockHelper.executeValidateAuth({
          params: input,
          blocksSource: EngineConstants.BLOCK_SOURCES,
        });

        return {
          status: EngineResponseStatus.OK,
          response: output,
        };
      }
    }
  } catch (error) {
    logger.warn('Engine operation failed.', error);
    return {
      status: EngineResponseStatus.ERROR,
      response: utils.tryParseJson((error as Error).message),
    };
  }
}
