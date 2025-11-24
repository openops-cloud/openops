import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { ALL_PRINCIPAL_TYPES, FlagId, PrincipalType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { flagService } from './flag.service';
import { flagHooks } from './flags.hooks';

export const flagModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(flagController, { prefix: '/v1/flags' });
};

export const flagController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
      },
      logLevel: 'silent',
      schema: {
        description:
          'Retrieve all system configuration flags and their values. This endpoint returns a map of flag IDs to their current values, including environment settings, feature flags, and system configurations.',
      },
    },
    async (request: FastifyRequest) => {
      const flags = await flagService.getAll();
      const flagsMap: Record<string, unknown> = flags.reduce(
        (map, flag) => ({ ...map, [flag.id as string]: flag.value }),
        {},
      );
      return flagHooks.get().modify({
        flags: flagsMap,
        request,
      });
    },
  );
  app.get(
    '/environment-id',
    {
      config: {
        allowedPrincipals: [PrincipalType.ENGINE],
      },
      schema: {
        description:
          'Retrieve the current environment ID. This endpoint is specifically for the engine to identify which environment it is running in.',
      },
    },
    async (_request, reply) => {
      const flag = await flagService.getOne(FlagId.ENVIRONMENT_ID);

      if (!flag) {
        await reply.status(StatusCodes.NOT_FOUND);
        return;
      }

      await reply.status(StatusCodes.OK).send({
        environmentId: flag.value,
      });
    },
  );
};
