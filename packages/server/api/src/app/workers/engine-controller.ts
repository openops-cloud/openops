import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  GetRunForWorkerRequest,
  logger,
  SharedSystemProp,
  system,
  UpdateFailureCountRequest,
  UpdateJobRequest,
} from '@openops/server-shared';
import {
  ApplicationError,
  assertNotNullOrUndefined,
  EngineHttpResponse,
  EnginePrincipal,
  EnvironmentType,
  ErrorCode,
  ExecutionState,
  FlowRunId,
  FlowRunResponse,
  FlowRunStatus,
  GetFlowVersionForWorkerRequest,
  GetFlowVersionForWorkerRequestType,
  isFlowStateTerminal,
  isNil,
  PopulatedFlow,
  PrincipalType,
  ProgressUpdateType,
  RemoveStableJobEngineRequest,
  StepOutput,
  UpdateRunProgressRequest,
  WebsocketClientEvent,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../authentication/authorization';
import { fileService } from '../file/file.service';
import { flowRunService } from '../flows/flow-run/flow-run-service';
import { flowVersionService } from '../flows/flow-version/flow-version.service';
import { flowService } from '../flows/flow/flow.service';
import { triggerHooks } from '../flows/trigger';
import { projectService } from '../project/project-service';
import { sendWorkflowExecutedEvent } from '../telemetry/event-models';
import { flowConsumer } from './consumer';
import { webhookResponseWatcher } from './helper/webhook-response-watcher';
import { flowQueue } from './queue';

export const flowEngineWorker: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.get(
    '/runs/:runId',
    {
      config: {
        allowedPrincipals: [PrincipalType.ENGINE],
      },
      schema: {
        description:
          'Retrieve detailed information about a specific flow run. This endpoint returns the complete execution state, including step outputs, duration, and any errors encountered during the run.',
        params: GetRunForWorkerRequest,
      },
    },
    async (request) => {
      const { runId } = request.params;
      return flowRunService.getOnePopulatedOrThrow({
        id: runId,
        projectId: request.principal.projectId,
      });
    },
  );

  app.post(
    '/update-job',
    {
      config: {
        allowedPrincipals: [PrincipalType.ENGINE],
      },
      schema: {
        description:
          'Update the status of a job in the queue. This endpoint allows the engine to mark jobs as completed or failed, with optional status messages for tracking job execution progress.',
        body: UpdateJobRequest,
      },
    },
    async (request) => {
      const environment = system.getOrThrow(SharedSystemProp.ENVIRONMENT);
      if (environment === EnvironmentType.TESTING) {
        return {};
      }
      const enginePrincipal = request.principal as unknown as EnginePrincipal;
      assertNotNullOrUndefined(enginePrincipal.queueToken, 'queueToken');
      const { id } = request.principal;
      const { queueName, status, message } = request.body;

      await flowConsumer.update({
        executionCorrelationId: id,
        queueName,
        status,
        message: message ?? 'NO_MESSAGE_AVAILABLE',
        token: enginePrincipal.queueToken,
      });
      return {};
    },
  );

  app.post('/update-failure-count', UpdateFailureCount, async (request) => {
    const { flowId, projectId, success } = request.body;
    await flowService.updateFailureCount({
      flowId,
      projectId,
      success,
    });
  });

  app.post('/update-run', UpdateStepProgress, async (request) => {
    const { executionCorrelationId, runId, workerHandlerId, runDetails } =
      request.body;
    const progressUpdateType =
      request.body.progressUpdateType ?? ProgressUpdateType.NONE;

    if (
      progressUpdateType === ProgressUpdateType.WEBHOOK_RESPONSE &&
      workerHandlerId &&
      executionCorrelationId &&
      isFlowStateTerminal(runDetails.status)
    ) {
      await webhookResponseWatcher.publish(
        runId,
        workerHandlerId,
        await getFlowResponse(runDetails),
      );
    }

    logger.debug(`Updating run ${runId} to ${runDetails.status}`);

    const populatedRun = await flowRunService.updateStatus({
      flowRunId: runId,
      status: runDetails.status,
      tasks: runDetails.tasks,
      duration: runDetails.duration,
      executionState: getExecutionState(runDetails),
      projectId: request.principal.projectId,
      tags: runDetails.tags ?? [],
      terminationReason: runDetails.terminationReason,
    });

    if (!populatedRun) {
      return;
    }

    if (runDetails.status === FlowRunStatus.PAUSED) {
      await flowRunService.pause({
        flowRunId: runId,
        pauseMetadata: {
          ...(runDetails.pauseMetadata ?? {}),
          progressUpdateType,
          handlerId: workerHandlerId ?? undefined,
          executionCorrelationId:
            runDetails.pauseMetadata?.executionCorrelationId ??
            executionCorrelationId,
        },
      });
    }

    app.io
      .to(populatedRun.projectId)
      .emit(WebsocketClientEvent.FLOW_RUN_PROGRESS, runId);

    if (isFlowStateTerminal(runDetails.status)) {
      await trackExecution(
        request.principal.projectId,
        runId,
        runDetails.status,
      );
    }
  });

  app.get('/flows', GetLockedVersionRequest, async (request) => {
    const populatedFlow = await getFlow(
      request.principal.projectId,
      request.query,
    );
    return {
      ...populatedFlow,
      version: await flowVersionService.lockBlockVersions({
        flowVersion: populatedFlow.version,
        projectId: request.principal.projectId,
      }),
    };
  });

  app.post('/remove-stale-job', RemoveFlowRequest, async (request) => {
    const { flowVersionId, flowId } = request.body;
    const flow = isNil(flowId)
      ? null
      : await flowService.getOnePopulated({
          projectId: request.principal.projectId,
          versionId: flowVersionId,
          id: flowId,
        });
    if (isNil(flow)) {
      await flowQueue.removeRepeatingJob({
        flowVersionId,
      });
      return;
    }
    await triggerHooks.disable({
      projectId: flow.projectId,
      flowVersion: flow.version,
      simulate: false,
      ignoreError: true,
    });
    return {};
  });

  app.get('/files/:fileId', GetFileRequestParams, async (request, reply) => {
    const { fileId } = request.params;
    const file = await fileService.getOneOrThrow({
      fileId,
    });
    return reply.type('application/zip').status(StatusCodes.OK).send(file.data);
  });
};

async function getFlow(
  projectId: string,
  request: GetFlowVersionForWorkerRequest,
): Promise<PopulatedFlow> {
  const { type } = request;
  switch (type) {
    case GetFlowVersionForWorkerRequestType.LATEST: {
      return flowService.getOnePopulatedOrThrow({
        id: request.flowId,
        projectId,
      });
    }
    case GetFlowVersionForWorkerRequestType.EXACT: {
      // TODO this can be optimized
      const flowVersion = await flowVersionService.getOneOrThrow(
        request.versionId,
      );
      return flowService.getOnePopulatedOrThrow({
        id: flowVersion.flowId,
        projectId,
        versionId: request.versionId,
      });
    }
    case GetFlowVersionForWorkerRequestType.LOCKED: {
      const rawFlow = await flowService.getOneOrThrow({
        id: request.flowId,
        projectId,
      });
      if (isNil(rawFlow.publishedVersionId)) {
        throw new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            entityId: rawFlow.id,
            message: 'Flow has no published version',
          },
        });
      }
      return flowService.getOnePopulatedOrThrow({
        id: rawFlow.id,
        projectId,
        versionId: rawFlow.publishedVersionId,
      });
    }
  }
}

function getExecutionState(
  flowRunResponse: FlowRunResponse,
): ExecutionState | null {
  if (
    [
      FlowRunStatus.TIMEOUT,
      FlowRunStatus.INTERNAL_ERROR,
      FlowRunStatus.STOPPED,
    ].includes(flowRunResponse.status)
  ) {
    return null;
  }
  return {
    steps: flowRunResponse.steps as Record<string, StepOutput>,
  };
}

async function getFlowResponse(
  result: FlowRunResponse,
): Promise<EngineHttpResponse> {
  switch (result.status) {
    case FlowRunStatus.STOPPED:
      return {
        status: result.stopResponse?.status ?? StatusCodes.OK,
        body: result.stopResponse?.body,
        headers: result.stopResponse?.headers ?? {},
      };
    case FlowRunStatus.INTERNAL_ERROR:
      return {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        body: {
          message: 'An internal error has occurred',
        },
        headers: {},
      };
    case FlowRunStatus.FAILED:
      return {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        body: {
          message: 'The flow has failed and there is no response returned',
        },
        headers: {},
      };
    case FlowRunStatus.TIMEOUT:
      return {
        status: StatusCodes.GATEWAY_TIMEOUT,
        body: {
          message: 'The request took too long to reply',
        },
        headers: {},
      };
    case FlowRunStatus.SUCCEEDED:
      return {
        status: StatusCodes.OK,
        body: {
          message: 'The request took too long to reply',
        },
        headers: {},
      };
    // Case that should be handled before
    default:
      throw new Error(`Unexpected flow run status: ${result.status}`);
  }
}

async function trackExecution(
  projectId: string,
  runId: FlowRunId,
  runStatus: FlowRunStatus,
): Promise<void> {
  try {
    const project = await projectService.getOneOrThrow(projectId);
    const flowRun = await flowRunService.getOneOrThrow({
      id: runId,
      projectId,
    });

    sendWorkflowExecutedEvent({
      flowVersionId: flowRun.flowVersionId,
      triggerSource: flowRun.triggerSource,
      flowId: flowRun.flowId,
      userId: project.ownerId,
      projectId,
      runStatus,
      runId,
    });
  } catch (error) {
    logger.warn('Failed to send workflow execution event.', error);
  }
}

const GetFileRequestParams = {
  config: {
    allowedPrincipals: [PrincipalType.ENGINE],
  },
  schema: {
    params: Type.Object({
      fileId: Type.String(),
    }),
  },
};

const UpdateStepProgress = {
  config: {
    allowedPrincipals: [PrincipalType.ENGINE],
  },
  schema: {
    body: UpdateRunProgressRequest,
  },
};

const UpdateFailureCount = {
  config: {
    allowedPrincipals: [PrincipalType.ENGINE],
  },
  schema: {
    description:
      'Update the failure count for a flow. This endpoint tracks the success or failure of flow executions, helping to monitor flow reliability and performance over time.',
    body: UpdateFailureCountRequest,
  },
};

const GetLockedVersionRequest = {
  config: {
    allowedPrincipals: [PrincipalType.ENGINE],
  },
  schema: {
    description:
      'Retrieve a specific version of a flow for execution. This endpoint fetches the exact flow version specified by flowId and versionId, ensuring the engine has the correct flow configuration for execution.',
    querystring: GetFlowVersionForWorkerRequest,
    response: {
      [StatusCodes.OK]: PopulatedFlow,
    },
  },
};

const RemoveFlowRequest = {
  config: {
    allowedPrincipals: [PrincipalType.ENGINE],
  },
  schema: {
    description:
      'Remove a stale job from the queue. This endpoint allows the engine to clean up jobs that are no longer needed, helping to maintain queue health and prevent resource leaks.',
    body: RemoveStableJobEngineRequest,
  },
};
