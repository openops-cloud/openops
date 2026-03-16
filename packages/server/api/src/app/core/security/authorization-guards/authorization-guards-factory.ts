import { AuthorizationGuards } from './authorization-guards';
import { noopAuthorizationGuards } from './noop-authorization-guards';

export function getAuthorizationGuards(): AuthorizationGuards {
  return noopAuthorizationGuards;
}
