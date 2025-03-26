import {
  ActionContext,
  BlockPropertyMap,
  ConnectionsManager,
  PauseHook,
  PauseHookParams,
  StaticPropsValue,
  StopHook,
  StopHookParams,
  TagsManager,
} from '@openops/blocks-framework';
import {
  ActionType,
  assertNotNullOrUndefined,
  AUTHENTICATION_PROPERTY_NAME,
  BlockAction,
  ExecutionType,
  FlowRunStatus,
  GenericStepOutput,
  isNil,
  StepOutputStatus,
} from '@openops/shared';
import { URL } from 'url';
import { blockLoader } from '../helper/block-loader';
import {
  continueIfFailureHandler,
  handleExecutionError,
  runWithExponentialBackoff,
} from '../helper/error-handling';
import { createConnectionService } from '../services/connections.service';
import { createFilesService } from '../services/files.service';
import { createContextStore } from '../services/storage.service';
import { ActionHandler, BaseExecutor } from './base-executor';
import { EngineConstants } from './context/engine-constants';
import {
  ExecutionVerdict,
  FlowExecutorContext,
} from './context/flow-execution-context';

type HookResponse = {
  stopResponse: StopHookParams | undefined;
  pauseResponse: PauseHookParams | undefined;
  tags: string[];
  stopped: boolean;
  paused: boolean;
};

export const blockExecutor: BaseExecutor<BlockAction> = {
  async handle({
    action,
    executionState,
    constants,
  }: {
    action: BlockAction;
    executionState: FlowExecutorContext;
    constants: EngineConstants;
  }) {
    if (executionState.isCompleted({ stepName: action.name })) {
      return executionState;
    }
    const resultExecution = await runWithExponentialBackoff(
      executionState,
      action,
      constants,
      executeAction,
    );
    return continueIfFailureHandler(resultExecution, action, constants);
  },
};

const executeAction: ActionHandler<BlockAction> = async ({
  action,
  executionState,
  constants,
}) => {
  const stepOutput = GenericStepOutput.create({
    input: {},
    type: ActionType.BLOCK,
    status: StepOutputStatus.SUCCEEDED,
  });

  try {
    assertNotNullOrUndefined(action.settings.actionName, 'actionName');
    const { blockAction, block } = await blockLoader.getBlockAndActionOrThrow({
      blockName: action.settings.blockName,
      blockVersion: action.settings.blockVersion,
      actionName: action.settings.actionName,
      blocksSource: constants.blocksSource,
    });

    const { resolvedInput, censoredInput } =
      await constants.variableService.resolve<
        StaticPropsValue<BlockPropertyMap>
      >({
        unresolvedInput: action.settings.input,
        executionState,
      });

    stepOutput.input = censoredInput;

    const { processedInput, errors } =
      await constants.variableService.applyProcessorsAndValidators(
        resolvedInput,
        blockAction.props,
        block.auth,
      );
    if (Object.keys(errors).length > 0) {
      throw new Error(JSON.stringify(errors));
    }

    const hookResponse: HookResponse = {
      stopResponse: undefined,
      stopped: false,
      pauseResponse: undefined,
      paused: false,
      tags: [],
    };
    const isPaused = executionState.isPaused({ stepName: action.name });
    const currentStepPath = executionState.currentPath.path.toString();
    const currentExecutionPath = currentStepPath
      ? currentStepPath
      : action.name; // currentStepPath exists only inside a loop
    const context: ActionContext = {
      currentExecutionPath,
      executionType: isPaused ? ExecutionType.RESUME : ExecutionType.BEGIN,
      resumePayload: constants.resumePayload!,
      store: createContextStore({
        apiUrl: constants.internalApiUrl,
        prefix: '',
        flowId: constants.flowId,
        engineToken: constants.engineToken,
        flowRunId: constants.flowRunId,
      }),
      flows: {
        current: {
          id: constants.flowId,
          version: {
            id: constants.flowVersionId,
          },
        },
      },
      auth: processedInput[AUTHENTICATION_PROPERTY_NAME],
      files: createFilesService({
        apiUrl: constants.internalApiUrl,
        engineToken: constants.engineToken,
        stepName: action.name,
        flowId: constants.flowId,
        type: constants.filesServiceType,
      }),
      server: {
        token: constants.engineToken,
        apiUrl: constants.internalApiUrl,
        publicUrl: constants.publicUrl,
      },
      propsValue: processedInput,
      tags: createTagsManager(hookResponse),
      connections: createConnectionManager({
        apiUrl: constants.internalApiUrl,
        projectId: constants.projectId,
        engineToken: constants.engineToken,
        hookResponse,
      }),
      serverUrl: constants.publicUrl,
      run: {
        id: constants.flowRunId,
        name: constants.flowName,
        pauseId: executionState.pauseId,
        stop: createStopHook(hookResponse),
        pause: createPauseHook(hookResponse, executionState.pauseId),
        isTest: constants.testSingleStepMode,
      },
      project: {
        id: constants.projectId,
      },
      generateResumeUrl: (params, baseUrl) => {
        const url = new URL(
          `${baseUrl ?? constants.internalApiUrl}v1/flow-runs/${
            constants.flowRunId
          }/requests/${executionState.pauseId}`,
        );
        url.search = new URLSearchParams({
          ...params.queryParams,
          path: currentExecutionPath,
        }).toString();
        return url.toString();
      },
    };
    const runMethodToExecute =
      constants.testSingleStepMode && !isNil(blockAction.test)
        ? blockAction.test
        : blockAction.run;
    const output = await runMethodToExecute(context);
    const newExecutionContext = executionState.addTags(hookResponse.tags);

    if (hookResponse.stopped) {
      assertNotNullOrUndefined(hookResponse.stopResponse, 'stopResponse');
      return newExecutionContext
        .upsertStep(
          action.name,
          stepOutput.setOutput(output).setStatus(StepOutputStatus.STOPPED),
        )
        .setVerdict(ExecutionVerdict.SUCCEEDED, {
          reason: FlowRunStatus.STOPPED,
          stopResponse: hookResponse.stopResponse.response,
        })
        .increaseTask();
    }
    if (hookResponse.paused) {
      assertNotNullOrUndefined(hookResponse.pauseResponse, 'pauseResponse');
      return newExecutionContext
        .upsertStep(
          action.name,
          stepOutput.setOutput(output).setStatus(StepOutputStatus.PAUSED),
        )
        .setVerdict(ExecutionVerdict.PAUSED, {
          reason: FlowRunStatus.PAUSED,
          pauseMetadata: hookResponse.pauseResponse.pauseMetadata,
        });
    }

    return newExecutionContext
      .upsertStep(action.name, stepOutput.setOutput(output))
      .increaseTask()
      .setVerdict(ExecutionVerdict.RUNNING, undefined);
  } catch (e) {
    const handledError = handleExecutionError(e);

    const failedStepOutput = stepOutput
      .setStatus(StepOutputStatus.FAILED)
      .setErrorMessage(handledError.message);

    return executionState
      .upsertStep(action.name, failedStepOutput)
      .setVerdict(ExecutionVerdict.FAILED, handledError.verdictResponse)
      .increaseTask();
  }
};

const createTagsManager = (hookResponse: HookResponse): TagsManager => {
  return {
    add: async (params: { name: string }): Promise<void> => {
      hookResponse.tags.push(params.name);
    },
  };
};

const createConnectionManager = ({
  engineToken,
  projectId,
  hookResponse,
  apiUrl,
}: {
  projectId: string;
  engineToken: string;
  hookResponse: HookResponse;
  apiUrl: string;
}): ConnectionsManager => {
  return {
    get: async (key: string) => {
      try {
        const connection = await createConnectionService({
          projectId,
          engineToken,
          apiUrl,
        }).obtain(key);
        hookResponse.tags.push(`connection:${key}`);
        return connection;
      } catch (e) {
        return null;
      }
    },
  };
};

function createStopHook(hookResponse: HookResponse): StopHook {
  return (req: StopHookParams) => {
    hookResponse.stopped = true;
    hookResponse.stopResponse = req;
  };
}

function createPauseHook(
  hookResponse: HookResponse,
  pauseId: string,
): PauseHook {
  return (req) => {
    hookResponse.paused = true;

    let executionCorrelationId = pauseId;
    if ('executionCorrelationId' in req.pauseMetadata) {
      executionCorrelationId = (
        req.pauseMetadata as { executionCorrelationId: string }
      ).executionCorrelationId;
    }

    hookResponse.pauseResponse = {
      pauseMetadata: {
        ...req.pauseMetadata,
        executionCorrelationId,
      },
    };
  };
}
