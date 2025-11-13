import { authenticateUserInOpenOpsTables } from '@openops/common';
import {
  ApplicationError,
  AuthenticationResponse,
  ErrorCode,
  isNil,
  Provider,
  User,
  UserStatus,
} from '@openops/shared';
import { userService } from '../../user/user-service';
import { passwordHasher } from './password-hasher';
import { getProjectAndToken } from '../context/create-project-auth-context';
import { createUser } from '../new-user/create-user';
import { assignDefaultOrganization } from '../new-user/organization-assignment';

export const authenticationService = {
  async signUp(params: SignUpParams): Promise<AuthenticationResponse> {
    const { user, tablesRefreshToken } = await createUser(params);

    await assignDefaultOrganization(user);

    return this.authResponse(user, tablesRefreshToken);
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
      request.password,
    );

    return this.authResponse(user, refresh_token);
  },

  async authResponse(
    user: User,
    tablesRefreshToken: string,
  ): Promise<AuthenticationResponse> {
    const projectContext = await getProjectAndToken(user, tablesRefreshToken);

    const userWithoutPassword = removePasswordPropFromUser(projectContext.user);

    return {
      ...userWithoutPassword,
      token: projectContext.token,
      projectId: projectContext.project.id,
      projectRole: projectContext.projectRole,
      tablesRefreshToken: projectContext.tablesRefreshToken,
    };
  },
};

const assertUserIsAllowedToSignIn: (
  user: User | null,
) => asserts user is User = (user) => {
  if (isNil(user)) {
    throw new ApplicationError({
      code: ErrorCode.INVALID_CREDENTIALS,
      params: null,
    });
  }
  if (user.status === UserStatus.INACTIVE) {
    throw new ApplicationError({
      code: ErrorCode.USER_IS_INACTIVE,
      params: {
        email: user.email,
      },
    });
  }
  if (!user.verified) {
    throw new ApplicationError({
      code: ErrorCode.EMAIL_IS_NOT_VERIFIED,
      params: {
        email: user.email,
      },
    });
  }
};

const assertPasswordMatches = async ({
  requestPassword,
  userPassword,
}: AssertPasswordsMatchParams): Promise<void> => {
  const passwordMatches = await passwordHasher.compare(
    requestPassword,
    userPassword,
  );

  if (!passwordMatches) {
    throw new ApplicationError({
      code: ErrorCode.INVALID_CREDENTIALS,
      params: null,
    });
  }
};

const removePasswordPropFromUser = (user: User): Omit<User, 'password'> => {
  const { password: _, ...filteredUser } = user;
  return filteredUser;
};

type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  trackEvents: boolean;
  newsLetter: boolean;
  verified: boolean;
  organizationId: string | null;
  provider: Provider;
};

type SignInParams = {
  email: string;
  password: string;
  organizationId: string | null;
  provider: Provider;
};

type AssertPasswordsMatchParams = {
  requestPassword: string;
  userPassword: string;
};
