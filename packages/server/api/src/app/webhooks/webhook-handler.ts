import {
  JobType,
  LATEST_JOB_DATA_SCHEMA_VERSION,
  logger,
} from '@openops/server-shared';
import {
  EngineHttpResponse,
  ErrorCode,
  EventPayload,
  ExecutionType,
  Flow,
  FlowId,
  FlowRunTriggerSource,
  FlowStatus,
  isNil,
  ProgressUpdateType,
  RunEnvironment,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { nanoid } from 'nanoid';
import { flowRunService } from '../flows/flow-run/flow-run-service';
import { flowRepo } from '../flows/flow/flow.repo';
import { webhookResponseWatcher } from '../workers/helper/webhook-response-watcher';
import { flowQueue } from '../workers/queue';
import { getJobPriority } from '../workers/queue/queue-manager';

export async function handleWebhookSimulation(
  request: FastifyRequest,
  flowId: string,
): Promise<EngineHttpResponse> {
  const result = await getFlowOrThrow(flowId);
  if (!result.success) {
    return {
      status: StatusCodes.NOT_FOUND,
      body: {
        ...result.error,
      },
      headers: {},
    };
  }

  const flow = result.flow;
  const payload = await convertRequest(request);
  const executionCorrelationId = nanoid();

  if (isNil(flow)) {
    return {
      status: StatusCodes.GONE,
      body: {},
      headers: {},
    };
  }

  await flowQueue.add({
    executionCorrelationId,
    type: JobType.WEBHOOK,
    priority: await getJobPriority(flow.projectId, undefined),
    data: {
      schemaVersion: LATEST_JOB_DATA_SCHEMA_VERSION,
      synchronousHandlerId: null,
      projectId: flow.projectId,
      executionCorrelationId,
      flowId: flow.id,
      simulate: true,
      payload,
    },
  });

  return {
    status: StatusCodes.OK,
    body: {},
    headers: {},
  };
}

export async function handleWebhook({
  request,
  flowId,
  async,
}: {
  request: FastifyRequest;
  flowId: string;
  async: boolean;
}): Promise<EngineHttpResponse> {
  const result = await getFlowOrThrow(flowId);
  if (!result.success) {
    return {
      status: StatusCodes.NOT_FOUND,
      body: {
        ...result.error,
      },
      headers: {},
    };
  }

  const flow = result.flow;
  const payload = await convertRequest(request);
  const executionCorrelationId = nanoid();
  const synchronousHandlerId = async
    ? undefined
    : webhookResponseWatcher.getServerId();

  if (flow.status !== FlowStatus.ENABLED || !flow.publishedVersionId) {
    return {
      status: StatusCodes.NOT_FOUND,
      body: {
        message: 'Flow is not enabled or has no published version',
      },
      headers: {},
    };
  }

  const flowRunId = await flowRunService.start({
    progressUpdateType: ProgressUpdateType.WEBHOOK_RESPONSE,
    triggerSource: FlowRunTriggerSource.TRIGGERED,
    flowVersionId: flow.publishedVersionId,
    environment: RunEnvironment.PRODUCTION,
    executionType: ExecutionType.BEGIN,
    projectId: flow.projectId,
    executionCorrelationId,
    synchronousHandlerId,
    payload,
  });

  if (async) {
    return {
      status: StatusCodes.OK,
      body: {},
      headers: {},
    };
  }

  return webhookResponseWatcher.oneTimeListener(flowRunId.id, false);
}

async function convertRequest(request: FastifyRequest): Promise<EventPayload> {
  return {
    method: request.method,
    headers: request.headers as Record<string, string>,
    body: await convertBody(request),
    queryParams: request.query as Record<string, string>,
  };
}

const convertBody = async (request: FastifyRequest): Promise<unknown> => {
  if (request.isMultipart()) {
    const jsonResult: Record<string, unknown> = {};
    const requestBodyEntries = Object.entries(
      request.body as Record<string, unknown>,
    );

    for (const [key, value] of requestBodyEntries) {
      jsonResult[key] =
        value instanceof Buffer ? value.toString('base64') : value;
    }

    return jsonResult;
  }
  return request.body;
};

type GetFlowResult =
  | { success: true; flow: Flow }
  | { success: false; error: Record<string, string> };

const getFlowOrThrow = async (flowId: FlowId): Promise<GetFlowResult> => {
  if (isNil(flowId)) {
    const errorMessage = 'Flow id is not defined.';
    logger.error(errorMessage);

    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION,
        message: errorMessage,
      },
    };
  }

  const flow = await flowRepo().findOneBy({ id: flowId });

  if (isNil(flow)) {
    const errorMessage = `Flow with id ${flowId} was not found.`;
    logger.error(errorMessage, {
      flowId,
    });

    return {
      success: false,
      error: {
        code: ErrorCode.FLOW_NOT_FOUND,
        message: errorMessage,
      },
    };
  }

  return {
    success: true,
    flow,
  };
};
