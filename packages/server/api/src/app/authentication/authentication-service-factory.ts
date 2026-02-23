import { InternalAuthenticationPayload } from '@openops/shared';
import { authenticationService } from './basic/authentication-service';
import { SignInParams, SignUpParams } from './types';

export type AuthenticationService = {
  signUp(
    params: SignUpParams,
    tokenExpirationInSeconds?: number,
  ): Promise<InternalAuthenticationPayload>;
  signIn(
    request: SignInParams,
    tokenExpirationInSeconds?: number,
  ): Promise<InternalAuthenticationPayload>;
};

export function getAuthenticationService(): AuthenticationService {
  return authenticationService;
}
