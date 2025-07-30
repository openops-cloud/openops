import {
  ActionType,
  CodeAction,
  FlowVersionState,
  GenericStepOutput,
  StepOutputStatus,
} from '@openops/shared';
import path from 'path';
import { CodeArtifact } from 'server-worker';
import { prepareCodeBlock } from '../code-block/prepare-code-block';
import { initCodeSandbox } from '../core/code/code-sandbox';
import {
  continueIfFailureHandler,
  handleExecutionError,
  runWithExponentialBackoff,
} from '../helper/error-handling';
import { ActionHandler, BaseExecutor } from './base-executor';
import { EngineConstants } from './context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
} from './context/flow-execution-context';

export const codeExecutor: BaseExecutor<CodeAction> = {
  async handle({
    action,
    executionState,
    constants,
  }: {
    action: CodeAction;
    executionState: FlowExecutorContext;
    constants: EngineConstants;
  }) {
    if (executionState.isCompleted({ stepName: action.name })) {
      return executionState;
    }

    const resultExecution = await getExecutionResult(
      action,
      executionState,
      constants,
    );

    return continueIfFailureHandler(resultExecution, action, constants);
  },
};

const executeAction: ActionHandler<CodeAction> = async ({
  action,
  executionState,
  constants,
}) => {
  const { censoredInput, resolvedInput } =
    await constants.variableService.resolve<Record<string, unknown>>({
      unresolvedInput: action.settings.input,
      executionState,
    });

  const stepOutput = GenericStepOutput.create({
    input: censoredInput,
    type: ActionType.CODE,
    status: StepOutputStatus.SUCCEEDED,
  });

  try {
    const artifactPath = path.resolve(
      `${constants.baseCodeDirectory}/${constants.flowVersionId}/${action.name}/index.js`,
    );
    const codeSandbox = await initCodeSandbox();

    const output = await codeSandbox.runCodeModule({
      isFreshImport: constants.flowVersionState === FlowVersionState.DRAFT,
      codeFile: artifactPath,
      inputs: resolvedInput,
    });

    return executionState
      .upsertStep(action.name, stepOutput.setOutput(output))
      .increaseTask();
  } catch (e) {
    const handledError = handleExecutionError(e);

    const failedStepOutput = stepOutput
      .setStatus(StepOutputStatus.FAILED)
      .setErrorMessage(handledError.message);

    return executionState
      .upsertStep(action.name, failedStepOutput)
      .setVerdict(ExecutionVerdict.FAILED, handledError.verdictResponse);
  }
};

async function getExecutionResult(
  action: CodeAction,
  executionState: FlowExecutorContext,
  constants: EngineConstants,
): Promise<FlowExecutorContext> {
  try {
    await prepareCodeBlock([
      {
        name: action.name,
        flowVersionId: constants.flowVersionId,
        flowVersionState: constants.flowVersionState,
        sourceCode: action.settings.sourceCode,
      },
    ] as CodeArtifact[]);
  } catch (error: unknown) {
    const handledError = handleExecutionError(error, true);

    const stepOutput = GenericStepOutput.create({
      input: {},
      type: ActionType.CODE,
      status: StepOutputStatus.FAILED,
    }).setErrorMessage(handledError.message);

    return executionState
      .upsertStep(action.name, stepOutput)
      .setVerdict(ExecutionVerdict.FAILED, handledError.verdictResponse);
  }

  return runWithExponentialBackoff(
    executionState,
    action,
    constants,
    executeAction,
  );
}
