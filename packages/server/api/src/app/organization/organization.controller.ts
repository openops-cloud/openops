import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  assertEqual,
  OpenOpsId,
  Organization,
  Permission,
  PrincipalType,
  SERVICE_KEY_SECURITY_OPENAPI,
  UpdateOrganizationRequestBody,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { organizationIdResolver } from '../core/security/route-policies/property-source-factory';
import { getOrganizationScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { organizationService } from './organization.service';

export const organizationController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.post('/:id', UpdateOrganizationRequest, async (req) => {
    return organizationService.update({
      id: req.params.id,
      ...req.body,
    });
  });

  app.get('/:id', GetOrganizationRequest, async (req) => {
    assertEqual(
      req.principal.organization.id,
      req.params.id,
      'userOrganizationId',
      'paramId',
    );

    const organization = await organizationService.getOneOrThrow(req.params.id);
    return organization;
  });
};

const UpdateOrganizationRequest = {
  config: {
    security: getOrganizationScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER],
      permission: Permission.WRITE_ORGANIZATION,
      organizationIdSource: organizationIdResolver.fromParams('id'),
    }),
  },
  schema: {
    body: UpdateOrganizationRequestBody,
    params: Type.Object({
      id: OpenOpsId,
    }),
    response: {
      [StatusCodes.OK]: Organization,
    },
    description:
      "Update an organization's details. This endpoint allows you to modify the properties of an existing organization, such as its name, settings, and other configuration options.",
  },
};

const GetOrganizationRequest = {
  config: {
    security: getOrganizationScopedRoutePolicy({
      allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
      organizationIdSource: organizationIdResolver.fromParams('id'),
    }),
  },
  schema: {
    tags: ['organizations'],
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    description:
      'Get an organization by its ID. This endpoint retrieves detailed information about a specific organization, including its configuration, settings, and associated metadata.',
    params: Type.Object({
      id: OpenOpsId,
    }),
    response: {
      [StatusCodes.OK]: Organization,
    },
  },
};
