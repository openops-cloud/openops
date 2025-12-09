import { authenticateUserInOpenOpsTables } from '@openops/common';
import { AuthenticationResponse } from '@openops/shared';
import { userService } from '../../user/user-service';
import { getUserCreatedHook } from '../authentication-service-factory';
import { getProjectAndToken } from '../context/create-project-auth-context';
import { createUser } from '../new-user/create-user';
import { assignDefaultOrganization } from '../new-user/organization-assignment';
import { SignInParams, SignUpParams } from '../types';
import {
  assertPasswordMatches,
  assertUserIsAllowedToSignIn,
  buildAuthResponse,
} from '../utils';

export const authenticationService = {
  async signUp(params: SignUpParams): Promise<AuthenticationResponse> {
    const { user, tablesRefreshToken } = await createUser(params);

    const userWithOrganization = await assignDefaultOrganization(user);
    await getUserCreatedHook(userWithOrganization).execute();

    const projectContext = await getProjectAndToken(user, tablesRefreshToken);
    return buildAuthResponse(projectContext);
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

    const { refresh_token: tablesRefreshToken } =
      await authenticateUserInOpenOpsTables(request.email, user.password);

    const projectContext = await getProjectAndToken(user, tablesRefreshToken);
    return buildAuthResponse(projectContext);
  },
};
