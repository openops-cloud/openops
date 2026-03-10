import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  ListTriggerEventsRequest,
  Permission,
  PrincipalType,
  TestPollingTriggerRequest,
} from '@openops/shared';
import { getProjectScopedRoutePolicy } from '../../core/security/route-policies/route-security-policy-factory';
import { systemJobsSchedule } from '../../helper/system-jobs';
import { SystemJobName } from '../../helper/system-jobs/common';
import { systemJobHandlers } from '../../helper/system-jobs/job-handlers';
import { flowService } from '../flow/flow.service';
import { triggerEventService } from './trigger-event.service';

const DEFAULT_PAGE_SIZE = 10;

export const triggerEventModule: FastifyPluginAsyncTypebox = async (app) => {
  systemJobHandlers.registerJobHandler(
    SystemJobName.TRIGGER_DATA_CLEANER,
    async function triggerDataCleanerJobHandler(): Promise<void> {
      await triggerEventService.deleteEventsOlderThanFourteenDay();
    },
  );
  await app.register(triggerEventController, { prefix: '/v1/trigger-events' });
  await systemJobsSchedule.upsertJob({
    job: {
      name: SystemJobName.TRIGGER_DATA_CLEANER,
      data: {},
    },
    schedule: {
      type: 'repeated',
      cron: '0 * */1 * *',
    },
  });
};

const triggerEventController: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    '/poll',
    {
      config: {
        security: getProjectScopedRoutePolicy({
          allowedPrincipals: [PrincipalType.USER],
          permission: Permission.READ_FLOW,
        }),
      },
      schema: {
        querystring: TestPollingTriggerRequest,
      },
    },
    async (request) => {
      const flow = await flowService.getOnePopulatedOrThrow({
        projectId: request.principal.projectId,
        id: request.query.flowId,
      });

      return triggerEventService.test({
        projectId: request.principal.projectId,
        flow,
      });
    },
  );

  fastify.post(
    '/',
    {
      config: {
        security: getProjectScopedRoutePolicy({
          allowedPrincipals: [PrincipalType.USER],
          permission: Permission.WRITE_FLOW,
        }),
      },
      schema: {
        querystring: TestPollingTriggerRequest,
      },
    },
    async (request) => {
      return triggerEventService.saveEvent({
        projectId: request.principal.projectId,
        flowId: request.query.flowId,
        payload: request.body,
        input: {},
      });
    },
  );

  fastify.get(
    '/',
    {
      config: {
        security: getProjectScopedRoutePolicy({
          allowedPrincipals: [PrincipalType.USER],
          permission: Permission.READ_FLOW,
        }),
      },
      schema: {
        querystring: ListTriggerEventsRequest,
      },
    },
    async (request) => {
      const flow = await flowService.getOnePopulatedOrThrow({
        id: request.query.flowId,
        projectId: request.principal.projectId,
      });

      return triggerEventService.list({
        projectId: request.principal.projectId,
        flow,
        cursor: request.query.cursor ?? null,
        limit: request.query.limit ?? DEFAULT_PAGE_SIZE,
      });
    },
  );
};
