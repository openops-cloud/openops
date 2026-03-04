import { AuthorizationHandler } from './authorization-handler';
import { simpleAuthorizationHandler } from './simple-authorization-handler';

export function getAuthorizationHandler(): AuthorizationHandler {
  return simpleAuthorizationHandler;
}
