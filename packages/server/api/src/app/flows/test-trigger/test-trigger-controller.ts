import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { PrincipalType, TestTriggerRequestBody } from '@openops/shared';
import { testTriggerService } from './test-trigger-service';

export const testTriggerController: FastifyPluginAsyncTypebox = async (app) => {
  app.post('/', TestTriggerRequest, async (req) => {
    const { projectId } = req.principal;
    const { flowId, flowVersionId, testStrategy } = req.body;

    return testTriggerService.test({
      flowId,
      flowVersionId,
      projectId,
      testStrategy,
    });
  });
};

const TestTriggerRequest = {
  schema: {
    description:
      'Test a flow trigger with specified parameters. This endpoint allows users to validate and test flow triggers before deploying them to production, helping ensure proper configuration and behavior.',
    body: TestTriggerRequestBody,
  },
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
};
