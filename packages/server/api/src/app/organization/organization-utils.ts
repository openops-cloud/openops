import { AppSystemProp, system } from '@openops/server-shared';
import { isNil, OpsEdition, Principal, PrincipalType } from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { userService } from '../user/user-service';
import { organizationService } from './organization.service';

const edition = system.getEdition();

export const resolveOrganizationIdFromEmail = async (
  userEmail: string,
): Promise<string | null> => {
  const shouldResolve = edition === OpsEdition.COMMUNITY;
  if (!shouldResolve) {
    return null;
  }
  const users = await userService.getUsersByEmail({ email: userEmail });
  if (users.length === 1) {
    return users[0].organizationId;
  }
  return null;
};

export const resolveOrganizationIdForAuthnRequest = async (
  userEmail: string,
  request: FastifyRequest,
): Promise<string | null> => {
  const organizationId = await resolveOrganizationIdFromEmail(userEmail);
  return organizationId ?? resolveOrganizationIdForRequest(request);
};

export const resolveOrganizationIdForRequest = async (
  request: FastifyRequest,
): Promise<string | null> => {
  const organizationId = await extractOrganizationIdFromAuthenticatedPrincipal(
    request.principal,
  );
  if (!isNil(organizationId)) {
    return organizationId;
  }
  return getOrganizationIdForHostname();
};

const extractOrganizationIdFromAuthenticatedPrincipal = async (
  principal: Principal,
): Promise<string | null> => {
  if (principal.type === PrincipalType.UNKNOWN) {
    return null;
  }
  return principal.organization.id ?? getDefaultOrganizationId();
};

const getOrganizationIdForHostname = async (): Promise<string | null> => {
  return getDefaultOrganizationId();
};

async function getDefaultOrganizationId(): Promise<null | string> {
  if (edition === OpsEdition.CLOUD) {
    return system.getOrThrow(AppSystemProp.CLOUD_ORGANIZATION_ID);
  }
  const organization = await organizationService.getOldestOrganization();
  return organization?.id ?? null;
}
