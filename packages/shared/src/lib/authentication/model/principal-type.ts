export enum PrincipalType {
  USER = 'USER',
  ENGINE = 'ENGINE',
  SERVICE = 'SERVICE',
  WORKER = 'WORKER',
  TOKEN_GENERATOR = 'TOKEN_GENERATOR',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_PRINCIPAL_TYPES = Object.values(PrincipalType).filter(
  (type) => type !== PrincipalType.UNKNOWN,
);

export const SERVICE_KEY_SECURITY_OPENAPI = {
  apiKey: [],
};

export enum EndpointScope {
  ORGANIZATION = 'ORGANIZATION',
  PROJECT = 'PROJECT',
}
