import { authenticateUserInOpenOpsTables } from '@openops/common';
import { AuthenticationResponse } from '@openops/shared';
import { userService } from '../../user/user-service';
import { AuthenticationService } from '../authentication-service-factory';
import { getProjectAndToken } from '../context/create-project-auth-context';
import { createUser } from '../new-user/create-user';
import {
  addUserToDefaultWorkspace,
  assignDefaultOrganization,
} from '../new-user/organization-assignment';
import { SignInParams, SignUpParams } from '../types';
import {
  assertPasswordMatches,
  assertUserIsAllowedToSignIn,
  buildAuthResponse,
} from '../utils';

export const authenticationService: AuthenticationService = {
  async signUp(
    params: SignUpParams,
    tokenExpirationInSeconds?: number,
  ): Promise<AuthenticationResponse> {
    const { user, tablesRefreshToken } = await createUser(params);

    const updatedUser = await assignDefaultOrganization(user);
    await addUserToDefaultWorkspace(updatedUser);

    const projectContext = await getProjectAndToken(
      user,
      tablesRefreshToken,
      tokenExpirationInSeconds,
    );

    return buildAuthResponse(projectContext);
  },

  async signIn(
    request: SignInParams,
    tokenExpirationInSeconds?: number,
  ): Promise<AuthenticationResponse> {
    const user = await userService.getByOrganizationAndEmail({
      organizationId: request.organizationId,
      email: request.email,
    });

    assertUserIsAllowedToSignIn(user);

    await assertPasswordMatches({
      requestPassword: request.password,
      userPassword: user.password,
    });

    const { refresh_token: tablesRefreshToken } =
      await authenticateUserInOpenOpsTables(request.email, user.password);

    const projectContext = await getProjectAndToken(
      user,
      tablesRefreshToken,
      tokenExpirationInSeconds,
    );

    return buildAuthResponse(projectContext);
  },
};
