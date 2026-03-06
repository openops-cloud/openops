export enum PrincipalType {
  USER = 'USER',
  ENGINE = 'ENGINE',
  SERVICE = 'SERVICE',
  WORKER = 'WORKER',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_PRINCIPAL_TYPES = Object.values(PrincipalType).filter(
  (type) => type !== PrincipalType.UNKNOWN,
);

export const SERVICE_KEY_SECURITY_OPENAPI = {
  apiKey: [],
};

export enum AuthorizationScope {
  ORGANIZATION = 'ORGANIZATION',
  PROJECT = 'PROJECT',
  UNSCOPED = 'UNSCOPED',
}

export enum RouteAccessType {
  AUTHENTICATED = 'AUTHENTICATED',
  PUBLIC = 'PUBLIC',
}

export type UnscopedAuthorizationPolicy = {
  authorizationScope: AuthorizationScope.UNSCOPED;
  allowedPrincipals: readonly PrincipalType[];
};

export type UnscopedRoutePolicy = {
  routeAccessType: RouteAccessType.AUTHENTICATED;
  authorization: UnscopedAuthorizationPolicy;
};

export type PublicRoutePolicy = {
  routeAccessType: RouteAccessType.PUBLIC;
};

export const PUBLIC_ROUTE_POLICY: Readonly<PublicRoutePolicy> = Object.freeze({
  routeAccessType: RouteAccessType.PUBLIC,
});

export const ENGINE_ROUTE_POLICY: Readonly<UnscopedRoutePolicy> = Object.freeze(
  {
    routeAccessType: RouteAccessType.AUTHENTICATED,
    authorization: {
      authorizationScope: AuthorizationScope.UNSCOPED,
      allowedPrincipals: [PrincipalType.ENGINE],
    } as UnscopedAuthorizationPolicy,
  },
);
