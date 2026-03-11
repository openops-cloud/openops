import {
  AuthorizationScope,
  Permission,
  PrincipalType,
  RouteAccessType,
} from '@openops/shared';
import { PropertyLocation, PropertySource } from './property-source';
import { AuthenticatedRoutePolicy } from './route-security-policy';

const defaultSource: PropertySource = {
  location: PropertyLocation.TOKEN,
};

export function getOrganizationScopedRoutePolicy({
  organizationIdSource = defaultSource,
  allowedPrincipals,
  permission,
}: {
  allowedPrincipals: readonly PrincipalType[];
  organizationIdSource?: PropertySource;
  permission?: Permission[] | Permission;
}): AuthenticatedRoutePolicy {
  return {
    routeAccessType: RouteAccessType.AUTHENTICATED,
    authorization: {
      authorizationScope: AuthorizationScope.ORGANIZATION,
      organizationIdSource,
      allowedPrincipals,
      permission,
    },
  };
}

export function getProjectScopedRoutePolicy({
  projectIdSource = defaultSource,
  allowedPrincipals,
  permission,
}: {
  allowedPrincipals: readonly PrincipalType[];
  projectIdSource?: PropertySource;
  permission?: Permission[] | Permission;
}): AuthenticatedRoutePolicy {
  return {
    routeAccessType: RouteAccessType.AUTHENTICATED,
    authorization: {
      authorizationScope: AuthorizationScope.PROJECT,
      allowedPrincipals,
      projectIdSource,
      permission,
    },
  };
}

export function getUnscopedRoutePolicy(
  allowedPrincipals: PrincipalType[],
): AuthenticatedRoutePolicy {
  return {
    routeAccessType: RouteAccessType.AUTHENTICATED,
    authorization: {
      authorizationScope: AuthorizationScope.UNSCOPED,
      allowedPrincipals,
    },
  };
}
