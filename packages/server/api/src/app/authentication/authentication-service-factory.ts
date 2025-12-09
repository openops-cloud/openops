import { AuthenticationResponse } from '@openops/shared';
import { authenticationService } from './basic/authentication-service';
import { SignInParams, SignUpParams } from './types';

export type AuthenticationService = {
  signUp(params: SignUpParams): Promise<AuthenticationResponse>;
  signIn(request: SignInParams): Promise<AuthenticationResponse>;
};

export function getAuthenticationService(): AuthenticationService {
  return authenticationService;
}
