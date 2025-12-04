import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { PrincipalType } from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { fileService } from './file.service';

export const fileController: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/:fileId', GetFileRequest, async (request, reply) => {
    const { fileId } = request.params;
    const file = await fileService.getOneOrThrow({
      projectId: request.principal.projectId,
      fileId,
    });
    return reply.type('application/zip').status(StatusCodes.OK).send(file.data);
  });
};

const GetFileRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  },
  schema: {
    operationId: 'Get File',
    params: Type.Object({
      fileId: Type.String(),
    }),
    description:
      'Retrieve a file by its ID. This endpoint allows you to download a specific file, returning its contents as a zip file. The file must be associated with the current project. The response includes proper content type headers and supports streaming for efficient file transfer. Returns a 404 error if the file is not found or if the user does not have access to it. The file data is automatically decompressed if it was stored with compression.',
  },
};
