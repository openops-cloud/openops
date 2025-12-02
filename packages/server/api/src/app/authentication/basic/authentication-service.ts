import { authenticateUserInOpenOpsTables } from '@openops/common';
import { AuthenticationResponse } from '@openops/shared';
import { userService } from '../../user/user-service';
import { getProjectAndToken } from '../context/create-project-auth-context';
import { createUser } from '../new-user/create-user';
import { assignDefaultOrganization } from '../new-user/organization-assignment';
import { SignInParams, SignUpParams } from '../types';
import {
  assertPasswordMatches,
  assertUserIsAllowedToSignIn,
  authResponse,
} from '../utils';

export const authenticationService = {
  async signUp(params: SignUpParams): Promise<AuthenticationResponse> {
    const { user, tablesRefreshToken } = await createUser(params);

    await assignDefaultOrganization(user);

    return authResponse(user, tablesRefreshToken, getProjectAndToken);
  },

  async signIn(request: SignInParams): Promise<AuthenticationResponse> {
    const user = await userService.getByOrganizationAndEmail({
      organizationId: request.organizationId,
      email: request.email,
    });

    assertUserIsAllowedToSignIn(user);

    await assertPasswordMatches({
      requestPassword: request.password,
      userPassword: user.password,
    });

    const { refresh_token } = await authenticateUserInOpenOpsTables(
      request.email,
      user.password,
    );

    return authResponse(user, refresh_token, getProjectAndToken);
  },
};
