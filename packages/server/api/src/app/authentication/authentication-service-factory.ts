import { AuthenticationResponse } from '@openops/shared';
import { authenticationService } from './basic/authentication-service';
import { SignInParams, SignUpParams } from './types';

export type AuthenticationService = {
  signUp(
    params: SignUpParams,
    tokenExpirationInSeconds?: number,
  ): Promise<AuthenticationResponse>;
  signIn(
    request: SignInParams,
    tokenExpirationInSeconds?: number,
  ): Promise<AuthenticationResponse>;
};

export function getAuthenticationService(): AuthenticationService {
  return authenticationService;
}
