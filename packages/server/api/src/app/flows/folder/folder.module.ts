import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  CreateFolderRequest,
  DeleteFolderRequest,
  ListFolderFlowsRequest,
  Permission,
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
  UpdateFolderRequest,
} from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
import { entitiesMustBeOwnedByCurrentProject } from '../../authentication/authorization';
import { flowFolderService as folderService } from './folder.service';

export const folderModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(folderController, { prefix: '/v1/folders' });
};

const folderController: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.addHook('preSerialization', entitiesMustBeOwnedByCurrentProject);
  fastify.post('/', CreateFolderParams, async (request) => {
    const createdFolder = await folderService.create({
      projectId: request.principal.projectId,
      request: request.body,
    });

    return createdFolder;
  });

  fastify.post('/:id', UpdateFolderParams, async (request) => {
    const updatedFlow = await folderService.update({
      projectId: request.principal.projectId,
      folderId: request.params.id,
      request: request.body,
    });

    return updatedFlow;
  });

  fastify.get('/:id', GetFolderParams, async (request) => {
    return folderService.getOneOrThrow({
      projectId: request.principal.projectId,
      folderId: request.params.id,
    });
  });

  fastify.get('/flows', ListFoldersFlowsParams, async (request) => {
    return folderService.listFolderFlows({
      projectId: request.principal.projectId,
      includeUncategorizedFolder: Boolean(
        !request.query.excludeUncategorizedFolder,
      ),
    });
  });

  fastify.delete('/:id', DeleteFolderParams, async (request, reply) => {
    await folderService.delete({
      projectId: request.principal.projectId,
      folderId: request.params.id,
    });
    return reply.status(StatusCodes.OK).send();
  });
};

const CreateFolderParams = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.WRITE_FLOW,
  },
  schema: {
    tags: ['folders'],
    description:
      'Create a new folder in the project. This endpoint allows you to organize flows by creating a hierarchical folder structure. You can specify an optional parent folder to create nested folders.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    body: CreateFolderRequest,
  },
};

const UpdateFolderParams = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.WRITE_FLOW,
  },
  schema: {
    tags: ['folders'],
    description:
      "Update an existing folder's properties. This endpoint allows you to modify the folder name and change its parent folder, effectively reorganizing the folder structure.",
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: Type.Object({
      id: Type.String(),
    }),
    body: UpdateFolderRequest,
  },
};

const GetFolderParams = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.READ_FLOW,
  },
  schema: {
    tags: ['folders'],
    params: Type.Object({
      id: Type.String(),
    }),
    description:
      "Retrieve detailed information about a specific folder. This endpoint returns the folder's metadata, including its name, creation date, and associated flows.",
    security: [SERVICE_KEY_SECURITY_OPENAPI],
  },
};

const ListFoldersFlowsParams = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.READ_FLOW,
  },
  schema: {
    tags: ['folders'],
    description:
      'List all folders and their associated flows in the project. This endpoint returns a hierarchical view of the folder structure, including the uncategorized folder unless explicitly excluded.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    querystring: ListFolderFlowsRequest,
  },
};

const DeleteFolderParams = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    permission: Permission.WRITE_FLOW,
  },
  schema: {
    params: DeleteFolderRequest,
    tags: ['folders'],
    description:
      'Delete a folder and its contents. This endpoint removes the specified folder and all its subfolders, moving any contained flows to the uncategorized folder.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
  },
};
