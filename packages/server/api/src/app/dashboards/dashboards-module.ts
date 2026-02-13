import {
  FastifyPluginAsyncTypebox,
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import { logger } from '@openops/server-shared';
import {
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
  WorkflowStats,
} from '@openops/shared';
import { FastifyReply } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getDashboardOverviewObject } from './get-dashboard-overview';
import { getWorkflowsStats } from './get-workflow-stats';

export const dashboardsModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(DashboardsController, { prefix: '/v1/dashboards' });
};

const DashboardsController: FastifyPluginCallbackTypebox = (
  fastify,
  _opts,
  done,
) => {
  fastify.get('/overview', async (_, reply: FastifyReply) => {
    try {
      const dashboardOverview = await getDashboardOverviewObject();
      if (!dashboardOverview) {
        return await reply.status(StatusCodes.NOT_FOUND).send();
      }

      return await reply.status(StatusCodes.OK).send(dashboardOverview);
    } catch (error) {
      logger.error(`Failed to fetch dashboard overview`, {
        error,
      });
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send();
    }
  });
  fastify.get('/workflows-stats', StatsRequest, async (request, reply) => {
    try {
      const projectId = request.principal.projectId;
      const workflowsStats = await getWorkflowsStats({
        projectId,
        createdAfter: request.query.createdAfter,
        createdBefore: request.query.createdBefore,
      });

      return await reply.status(StatusCodes.OK).send(workflowsStats);
    } catch (error) {
      logger.error(`Failed to fetch workflow stats`, {
        error,
      });
      return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send();
    }
  });
  done();
};

const StatsRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  },
  schema: {
    tags: ['dashboards'],
    description: 'List Workflow Statistics',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    querystring: Type.Object({
      createdAfter: Type.Optional(Type.String({})),
      createdBefore: Type.Optional(Type.String({})),
    }),
    response: {
      [StatusCodes.OK]: WorkflowStats,
      [StatusCodes.INTERNAL_SERVER_ERROR]: Type.Unknown(),
    },
  },
};
