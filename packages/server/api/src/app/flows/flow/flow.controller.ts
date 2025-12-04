import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { TriggerStrategy } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import {
  ApplicationError,
  CountFlowsRequest,
  CreateEmptyFlowRequest,
  CreateFlowFromTemplateRequest,
  ErrorCode,
  ExecutionType,
  FlowOperationRequest,
  FlowRunTriggerSource,
  FlowTemplateWithoutProjectInformation,
  FlowVersionMetadata,
  GetFlowQueryParamsRequest,
  GetFlowTemplateRequestQuery,
  ListFlowsRequest,
  ListFlowVersionRequest,
  OpenOpsId,
  openOpsId,
  Permission,
  PopulatedFlow,
  Principal,
  PrincipalType,
  ProgressUpdateType,
  RunEnvironment,
  RunFlowResponses,
  SeekPage,
  SERVICE_KEY_SECURITY_OPENAPI,
  TriggerType,
  TriggerWithOptionalId,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { projectService } from '../../project/project-service';
import { sendWorkflowCreatedFromTemplateEvent } from '../../telemetry/event-models';
import { flowRunService } from '../flow-run/flow-run-service';
import { flowVersionService } from '../flow-version/flow-version.service';
import { triggerUtils } from '../trigger/hooks/trigger-utils';
import {
  assertThatFlowIsNotBeingUsed,
  assertThatFlowIsNotInternal,
} from './flow-validations';
import { flowService } from './flow.service';

const DEFAULT_PAGE_SIZE = 10;

export const flowController: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);

  app.post('/', CreateFlowRequestOptions, async (request, reply) => {
    let newFlow: PopulatedFlow;

    if ('template' in request.body) {
      const requestBody = request.body as CreateFlowFromTemplateRequest;

      const userId = await extractUserIdFromPrincipal(request.principal);

      newFlow = await createFromTemplate(
        userId,
        request.principal.projectId,
        requestBody.template,
        requestBody.connectionIds,
      );
    } else {
      newFlow = await flowService.create({
        projectId: request.principal.projectId,
        userId: request.principal.id,
        request: request.body,
      });
    }

    return reply.status(StatusCodes.CREATED).send(newFlow);
  });

  app.post('/:id', UpdateFlowRequestOptions, async (request) => {
    const userId = await extractUserIdFromPrincipal(request.principal);

    const flow = await flowService.getOnePopulatedOrThrow({
      id: request.params.id,
      projectId: request.principal.projectId,
    });
    await assertThatFlowIsNotInternal(flow);
    await assertThatFlowIsNotBeingUsed(flow, userId);

    const updatedFlow = await flowService.update({
      id: request.params.id,
      userId,
      projectId: request.principal.projectId,
      operation: request.body,
    });
    return updatedFlow;
  });

  app.get('/', ListFlowsRequestOptions, async (request) => {
    // TODO: use ListFlowsRequest.versionState to filter flows by version state
    return flowService.list({
      projectId: request.principal.projectId,
      folderId: request.query.folderId,
      cursorRequest: request.query.cursor ?? null,
      limit: request.query.limit ?? DEFAULT_PAGE_SIZE,
      status: request.query.status,
      name: request.query.name,
      versionState: request.query.versionState ?? null,
    });
  });

  app.get('/count', CountFlowsRequestOptions, async (request) => {
    return flowService.count({
      folderId: request.query.folderId,
      projectId: request.principal.projectId,
    });
  });

  app.get('/:id/template', GetFlowTemplateRequestOptions, async (request) => {
    return flowService.getTemplate({
      userId: request.principal.id,
      flowId: request.params.id,
      projectId: request.principal.projectId,
      versionId: request.query.versionId,
    });
  });

  app.get('/:id', GetFlowRequestOptions, async (request) => {
    return flowService.getOnePopulatedOrThrow({
      id: request.params.id,
      projectId: request.principal.projectId,
      versionId: request.query.versionId,
    });
  });

  app.delete('/:id', DeleteFlowRequestOptions, async (request, reply) => {
    await flowService.delete({
      id: request.params.id,
      userId: request.principal.id,
      projectId: request.principal.projectId,
    });

    return reply.status(StatusCodes.NO_CONTENT).send();
  });

  app.get('/:id/versions', GetFlowVersionRequestOptions, async (request) => {
    const flow = await flowService.getOneOrThrow({
      id: request.params.id,
      projectId: request.principal.projectId,
    });

    return flowVersionService.list({
      flowId: flow.id,
      limit: request.query.limit ?? DEFAULT_PAGE_SIZE,
      cursorRequest: request.query.cursor ?? null,
    });
  });

  app.post('/:id/run', RunFlowRequestOptions, async (request, reply) => {
    try {
      const flow = await flowService.getOnePopulatedOrThrow({
        id: request.params.id,
        projectId: request.principal.projectId,
      });

      await assertThatFlowIsNotInternal(flow);

      if (!flow.publishedVersionId) {
        return await reply.status(StatusCodes.BAD_REQUEST).send({
          success: false,
          message:
            'Workflow must be published before it can be triggered manually',
        });
      }

      const publishedFlow = await flowService.getOnePopulatedOrThrow({
        id: request.params.id,
        projectId: request.principal.projectId,
        versionId: flow.publishedVersionId,
      });

      const validationResult = await validateTriggerType(
        publishedFlow,
        request.principal.projectId,
      );
      if (!validationResult.success) {
        return await reply
          .status(StatusCodes.BAD_REQUEST)
          .send(validationResult);
      }

      const payload =
        validationResult.triggerStrategy === TriggerStrategy.WEBHOOK
          ? {
              body: {},
              headers: {},
              queryParams: (request.query ?? {}) as Record<string, string>,
            }
          : {};

      const flowRun = await flowRunService.start({
        environment: RunEnvironment.PRODUCTION,
        flowVersionId: publishedFlow.version.id,
        projectId: request.principal.projectId,
        payload,
        executionType: ExecutionType.BEGIN,
        synchronousHandlerId: undefined,
        executionCorrelationId: openOpsId(),
        progressUpdateType: ProgressUpdateType.NONE,
        triggerSource: FlowRunTriggerSource.MANUAL_RUN,
      });

      return await reply.status(StatusCodes.OK).send({
        success: true,
        flowRunId: flowRun.id,
        status: flowRun.status,
        message: 'Workflow execution started successfully',
      });
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        error.error?.code === ErrorCode.ENTITY_NOT_FOUND
      ) {
        return reply.status(StatusCodes.BAD_REQUEST).send({
          success: false,
          message: `Something went wrong while triggering the workflow execution manually. ${error.message}`,
        });
      }
      throw error;
    }
  });
};

async function createFromTemplate(
  userId: string,
  projectId: string,
  template: {
    id: string;
    isSample: boolean;
    displayName: string;
    description?: string;
    trigger: TriggerWithOptionalId;
  },
  connectionIds: string[],
) {
  const updatedFlow = await flowService.createFromTrigger({
    projectId,
    userId,
    displayName: template.displayName,
    description: template.description,
    trigger: template.trigger,
    connectionIds,
  });

  sendWorkflowCreatedFromTemplateEvent(
    userId,
    updatedFlow.id,
    updatedFlow.projectId,
    template.id,
    template.displayName,
    template.isSample,
  );

  return updatedFlow;
}

async function extractUserIdFromPrincipal(
  principal: Principal,
): Promise<string> {
  if (principal.type === PrincipalType.USER) {
    return principal.id;
  }
  // TODO currently it's same as api service, but it's better to get it from api key service, in case we introduced more admin users
  const project = await projectService.getOneOrThrow(principal.projectId);
  return project.ownerId;
}

async function validateTriggerType(
  flow: PopulatedFlow,
  projectId: string,
): Promise<{
  success: boolean;
  message: string;
  triggerStrategy?: TriggerStrategy;
}> {
  const blockTrigger = flow.version.trigger;

  if (blockTrigger.type !== TriggerType.BLOCK) {
    logger.warn(
      `Blocktype is not of type ${TriggerType.BLOCK}. This should never happen. `,
    );
    return {
      success: false,
      message: `Trigger type is not a block: type: ${blockTrigger.type}`,
    };
  }

  try {
    const metadata = await triggerUtils.getBlockTriggerOrThrow({
      trigger: blockTrigger,
      projectId,
    });

    if (
      metadata.type === TriggerStrategy.SCHEDULED ||
      metadata.type == TriggerStrategy.WEBHOOK
    ) {
      return {
        success: true,
        message: 'Trigger type validation successful',
        triggerStrategy: metadata.type,
      };
    }

    return {
      success: false,
      message: 'Only polling and webhook workflows can be triggered manually',
    };
  } catch (error) {
    return {
      success: false,
      message: `Something went wrong while validating the trigger type. ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

const CreateFlowRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.WRITE_FLOW,
  },
  schema: {
    tags: ['flows'],
    description:
      'Create a new flow either from scratch or from a template. When creating from a template, provide the template details and connection IDs. When creating from scratch, provide the basic flow configuration.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    body: Type.Union([CreateEmptyFlowRequest, CreateFlowFromTemplateRequest]),
    response: {
      [StatusCodes.CREATED]: PopulatedFlow,
    },
  },
};

const UpdateFlowRequestOptions = {
  config: {
    permission: Permission.UPDATE_FLOW_STATUS,
  },
  schema: {
    tags: ['flows'],
    description:
      'Apply an operation to modify an existing flow. This endpoint allows updating flow properties, status, and configuration. The operation will be rejected if the flow is currently being edited by another user.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    body: FlowOperationRequest,
    params: Type.Object({
      id: OpenOpsId,
    }),
  },
};

const ListFlowsRequestOptions = {
  config: {
    allowedPrincipals: [
      PrincipalType.USER,
      PrincipalType.SERVICE,
      PrincipalType.WORKER,
    ],
    permission: Permission.READ_FLOW,
  },
  schema: {
    operationId: 'List Workflows',
    tags: ['flows'],
    description:
      'Retrieve a paginated list of workflows for the current project. Supports filtering by folder, status, name, and version state. Results are returned in a seek-based pagination format.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    querystring: ListFlowsRequest,
    response: {
      [StatusCodes.OK]: SeekPage(PopulatedFlow),
    },
  },
};

const CountFlowsRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.SERVICE, PrincipalType.USER],
  },
  schema: {
    operationId: 'Get Flow Count',
    description:
      'Retrieve a list of a workflows for the current project. Supports filtering by folder.',
    querystring: CountFlowsRequest,
  },
};

const GetFlowVersionRequestOptions = {
  schema: {
    tags: ['flows'],
    description:
      'Retrieve a paginated list of version history for a specific flow. Each version includes metadata about changes, timestamps, and the user who made the modifications.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: Type.Object({
      id: OpenOpsId,
    }),
    querystring: ListFlowVersionRequest,
    response: {
      [StatusCodes.OK]: SeekPage(FlowVersionMetadata),
    },
  },
};

const GetFlowTemplateRequestOptions = {
  schema: {
    params: Type.Object({
      id: OpenOpsId,
    }),
    querystring: GetFlowTemplateRequestQuery,
    response: {
      [StatusCodes.OK]: FlowTemplateWithoutProjectInformation,
    },
  },
};

const GetFlowRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.READ_FLOW,
  },
  schema: {
    operationId: 'Get Flow Details',
    tags: ['flows'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      'Retrieve detailed information about a specific flow including its current version, configuration, and associated metadata. Optionally specify a version ID to get historical flow data.',
    params: Type.Object({
      id: OpenOpsId,
    }),
    querystring: GetFlowQueryParamsRequest,
    response: {
      [StatusCodes.OK]: PopulatedFlow,
    },
  },
};

const DeleteFlowRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.WRITE_FLOW,
  },
  schema: {
    tags: ['flows'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      'Permanently delete a flow and all its associated versions. This operation cannot be undone and will remove all flow data including configurations, versions, and execution history.',
    params: Type.Object({
      id: OpenOpsId,
    }),
    response: {
      [StatusCodes.NO_CONTENT]: Type.Never(),
    },
  },
};

const RunFlowRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.WRITE_FLOW,
    preSerializationHook: entitiesMustBeOwnedByCurrentProject,
  },
  schema: {
    tags: ['flows'],
    description:
      'Manually trigger a workflow execution. Works for polling and webhook-type workflows. Query params will be forwarded for webhook triggers.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: Type.Object({
      id: OpenOpsId,
    }),
    querystring: Type.Record(Type.String(), Type.String()),
    response: RunFlowResponses,
  },
};
