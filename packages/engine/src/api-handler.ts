import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  blocksBuilder,
  logger,
  MAX_REQUEST_BODY_BYTES,
  runWithLogContext,
  setStopHandlers,
} from '@openops/server-shared';
import { EngineResponseStatus } from '@openops/shared';
import fastify from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { executeEngine } from './engine-executor';
import { EngineRequest } from './main';

const app = fastify({ bodyLimit: MAX_REQUEST_BODY_BYTES });

const engineController: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post(
    '/execute',
    {
      schema: {
        body: EngineRequest,
        description:
          'Execute an engine operation. This endpoint processes engine requests with proper logging context, handling various operation types and managing request deadlines.',
      },
    },
    async (request, reply) => {
      const requestIdHeaders = request.headers;
      const requestId = Array.isArray(requestIdHeaders)
        ? requestIdHeaders[0]
        : requestIdHeaders;

      await runWithLogContext(
        {
          deadlineTimestamp: request.body.deadlineTimestamp.toString(),
          requestId: requestId ?? request.id,
          operationType: request.body.operationType,
        },
        () => handleRequest(request, reply),
      );
    },
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRequest(request: any, reply: any): Promise<void> {
  try {
    const { engineInput, operationType } = request.body as EngineRequest;

    logger.info(`Received request for operation [${operationType}]`, {
      operationType,
    });

    const result = await executeEngine(engineInput, operationType);

    await reply.status(StatusCodes.OK).send(result);
  } catch (error) {
    logger.error('Engine execution failed.', { error });

    await reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send(
      JSON.stringify({
        status: EngineResponseStatus.ERROR,
        message: 'Engine execution failed.',
      }),
    );
  }
}

export const start = async (): Promise<void> => {
  try {
    logger.info('Starting Engine API...');

    setStopHandlers(app);

    await blocksBuilder();
    await app.register(engineController);

    await app.listen({
      host: '0.0.0.0',
      port: 3005,
    });

    logger.info('Engine listening on 3005.');
  } catch (err) {
    logger.error('Something wrong with the engine API.', { err });

    throw err;
  }
};
