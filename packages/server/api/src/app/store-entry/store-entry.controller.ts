import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  DeleteStoreEntryRequest,
  GetStoreEntryRequest,
  PrincipalType,
  PutStoreEntryRequest,
  STORE_VALUE_MAX_SIZE,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import sizeof from 'object-sizeof';
import { storeEntryService } from './store-entry.service';

export const storeEntryController: FastifyPluginAsyncTypebox = async (
  fastify,
) => {
  fastify.post('/', CreateRequest, async (request, reply) => {
    const sizeOfValue = sizeof(request.body.value);
    if (sizeOfValue > STORE_VALUE_MAX_SIZE) {
      await reply.status(StatusCodes.REQUEST_TOO_LONG).send({});
      return;
    }
    const response = await storeEntryService.upsert({
      projectId: request.principal.projectId,
      request: request.body,
    });
    await reply.status(StatusCodes.OK).send(response);
  });

  fastify.get('/', GetRequest, async (request, reply) => {
    const value = await storeEntryService.getOne({
      projectId: request.principal.projectId,
      key: request.query.key,
    });

    if (!value) {
      return reply.code(StatusCodes.NOT_FOUND).send('Value not found!');
    }

    return value;
  });

  fastify.delete('/', DeleteStoreRequest, async (request, reply) => {
    if (request.principal.type !== PrincipalType.ENGINE) {
      return reply.status(StatusCodes.FORBIDDEN);
    } else {
      return storeEntryService.delete({
        projectId: request.principal.projectId,
        key: request.query.key,
      });
    }
  });

  fastify.get('/list', ListRequest, async (request) => {
    const entries = await storeEntryService.list({
      projectId: request.principal.projectId,
      prefix: request.query.prefix,
    });

    return { entries };
  });
};

const CreateRequest = {
  schema: {
    body: PutStoreEntryRequest,
    description:
      "Create or update a key-value store entry. This endpoint allows you to store and manage data in the project's key-value store, with automatic size validation to prevent oversized entries.",
  },
};

const GetRequest = {
  schema: {
    querystring: GetStoreEntryRequest,
    description:
      "Retrieve a value from the key-value store. This endpoint fetches the value associated with a specific key in the project's store, returning a 404 error if the key is not found.",
  },
};

const DeleteStoreRequest = {
  schema: {
    querystring: DeleteStoreEntryRequest,
    description:
      "Delete a key-value store entry. This endpoint removes a specific key-value pair from the project's store. Note that this operation is restricted to engine principals only.",
  },
};

const ListRequest = {
  schema: {
    querystring: Type.Object({
      prefix: Type.String(),
    }),
    description:
      'List all keys in the store with a prefix filter. This endpoint returns all keys that start with the specified prefix.',
  },
};
