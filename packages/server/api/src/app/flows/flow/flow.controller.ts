import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ApplicationError,
  CountFlowsRequest,
  CreateEmptyFlowRequest,
  CreateFlowFromTemplateRequest,
  ErrorCode,
  FlowOperationRequest,
  FlowTemplateWithoutProjectInformation,
  FlowVersionMetadata,
  GetFlowQueryParamsRequest,
  GetFlowTemplateRequestQuery,
  isNil,
  ListFlowsRequest,
  ListFlowVersionRequest,
  OpenOpsId,
  Permission,
  PopulatedFlow,
  Principal,
  PrincipalType,
  SeekPage,
  SERVICE_KEY_SECURITY_OPENAPI,
  Trigger,
} from '@openops/shared';
import dayjs from 'dayjs';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { projectService } from '../../project/project-service';
import { flowVersionService } from '../flow-version/flow-version.service';
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
};

async function createFromTemplate(
  userId: string,
  projectId: string,
  template: {
    id: string;
    isSample: boolean;
    displayName: string;
    description?: string;
    trigger: Trigger;
  },
  connectionIds: string[],
) {
  return flowService.createFromTemplate({
    projectId,
    userId,
    displayName: template.displayName,
    description: template.description,
    trigger: template.trigger,
    templateId: template.id,
    connectionIds,
    isSample: template.isSample,
  });
}

async function assertThatFlowIsNotBeingUsed(
  flow: PopulatedFlow,
  userId: string,
): Promise<void> {
  const currentTime = dayjs();
  if (
    !isNil(flow.version.updatedBy) &&
    flow.version.updatedBy !== userId &&
    currentTime.diff(dayjs(flow.version.updated), 'minute') <= 1
  ) {
    throw new ApplicationError({
      code: ErrorCode.FLOW_IN_USE,
      params: {
        flowVersionId: flow.version.id,
        message:
          'Flow is being used by another user in the last minute. Please try again later.',
      },
    });
  }
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

const CreateFlowRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
    permission: Permission.WRITE_FLOW,
  },
  schema: {
    tags: ['flows'],
    description: 'Create a flow',
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
    description: 'Apply an operation to a flow',
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
    tags: ['flows'],
    description: 'List flows',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    querystring: ListFlowsRequest,
    response: {
      [StatusCodes.OK]: SeekPage(PopulatedFlow),
    },
  },
};

const CountFlowsRequestOptions = {
  schema: {
    querystring: CountFlowsRequest,
  },
};

const GetFlowVersionRequestOptions = {
  schema: {
    tags: ['flows'],
    description: 'Get a flow version by id',
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
    tags: ['flows'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description: 'Get a flow by id',
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
    description: 'Delete a flow',
    params: Type.Object({
      id: OpenOpsId,
    }),
    response: {
      [StatusCodes.NO_CONTENT]: Type.Never(),
    },
  },
};
