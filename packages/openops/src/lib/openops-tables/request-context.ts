import { AxiosHeaders } from 'axios';
import {
  createAxiosHeaders,
  createAxiosHeadersForOpenOpsTablesBlock,
} from './requests-helpers';

/**
 * Request context that encapsulates authentication details for OpenOps Tables API calls.
 * This pattern decouples the data fetching functions from specific authentication scheme details.
 */
export interface RequestContext {
  token: string;
  createHeaders: (token: string) => AxiosHeaders;
}

/**
 * This is typically used for direct API calls with the default user.
 *
 * @param token - The JWT token
 * @returns A RequestContext configured for JWT authentication
 */
export function createJwtRequestContext(token: string): RequestContext {
  return {
    token,
    createHeaders: createAxiosHeaders,
  };
}

/**
 * This is typically used for block actions when USE_DATABASE_TOKEN is enabled.
 *
 * @param token - The database token
 * @returns A RequestContext configured for database token authentication
 */
export function createDatabaseTokenRequestContext(
  token: string,
): RequestContext {
  return {
    token,
    createHeaders: createAxiosHeadersForOpenOpsTablesBlock,
  };
}

/**
 * @deprecated Use createJwtRequestContext or createDatabaseTokenRequestContext instead
 */
export function createRequestContext(
  token: string,
  useJwt: boolean,
): RequestContext {
  return useJwt
    ? createJwtRequestContext(token)
    : createDatabaseTokenRequestContext(token);
}
