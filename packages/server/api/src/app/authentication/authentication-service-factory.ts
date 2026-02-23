import { AuthenticationResponseWithSensitiveData } from '@openops/shared';
import { authenticationService } from './basic/authentication-service';
import { SignInParams, SignUpParams } from './types';

export type AuthenticationService = {
  signUp(
    params: SignUpParams,
    tokenExpirationInSeconds?: number,
  ): Promise<AuthenticationResponseWithSensitiveData>;
  signIn(
    request: SignInParams,
    tokenExpirationInSeconds?: number,
  ): Promise<AuthenticationResponseWithSensitiveData>;
};

export function getAuthenticationService(): AuthenticationService {
  return authenticationService;
}
