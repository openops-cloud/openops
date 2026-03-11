import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ALL_PRINCIPAL_TYPES,
  OpenOpsId,
  Permission,
  USE_DRAFT_QUERY_PARAM_NAME,
} from '@openops/shared';
import { getProjectScopedRoutePolicy } from '../../../core/security/route-policies/route-security-policy-factory';
import { formService } from './form.service';

export const formController: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/:flowId', GetFormRequest, async (request) => {
    return formService.getFormByFlowIdOrThrow(
      request.params.flowId,
      request.principal.projectId,
      request.query.useDraft ?? false,
    );
  });
};

const GetFormRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
    security: getProjectScopedRoutePolicy({
      allowedPrincipals: ALL_PRINCIPAL_TYPES,
      permission: Permission.READ_FLOW,
    }),
  },
  schema: {
    description:
      'Retrieve form configuration for a specific flow. This endpoint returns the form structure, including input fields, validation rules, and submission settings. The form can be retrieved from either the published version or draft version of the flow based on the useDraft parameter.',
    params: Type.Object({
      flowId: OpenOpsId,
    }),
    querystring: Type.Object({
      [USE_DRAFT_QUERY_PARAM_NAME]: Type.Optional(Type.Boolean()),
    }),
  },
};
