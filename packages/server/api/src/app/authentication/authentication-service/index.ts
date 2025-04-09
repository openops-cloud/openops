import { authenticateUserInOpenOpsTables } from '@openops/common';
import { logger, SharedSystemProp, system } from '@openops/server-shared';
import {
  ApplicationError,
  AuthenticationResponse,
  EnvironmentType,
  ErrorCode,
  isNil,
  OrganizationRole,
  User,
  UserId,
  UserStatus,
} from '@openops/shared';
import { QueryFailedError } from 'typeorm';
import { flagService } from '../../flags/flag.service';
import { openopsTables } from '../../openops-tables';
import { userService } from '../../user/user-service';
import { passwordHasher } from '../lib/password-hasher';
import { authenticationServiceHooks as hooks } from './hooks';
import { Provider } from './hooks/authentication-service-hooks';

export const authenticationService = {
  async signUp(params: SignUpParams): Promise<AuthenticationResponse> {
    await hooks.get().preSignUp(params);
    const user = await createUser(params);

    const { token, refresh_token } = await openopsTables.createUser({
      name: `${params.firstName} ${params.lastName}`,
      email: params.email,
      password: params.password,
      authenticate: true,
    });

    return this.signUpResponse({
      user,
      tablesAccessToken: token,
      tablesRefreshToken: refresh_token,
      referringUserId: params.referringUserId,
    });
  },

  async signIn(request: SignInParams): Promise<AuthenticationResponse> {
    await hooks.get().preSignIn(request);

    const user = await userService.getByOrganizationAndEmail({
      organizationId: request.organizationId,
      email: request.email,
    });

    assertUserIsAllowedToSignIn(user);

    await assertPasswordMatches({
      requestPassword: request.password,
      userPassword: user.password,
    });

    const { token, refresh_token } = await authenticateUserInOpenOpsTables(
      request.email,
      request.password,
    );

    return this.signInResponse({
      user,
      tablesAccessToken: token,
      tablesRefreshToken: refresh_token,
    });
  },

  async signUpResponse({
    user,
    tablesAccessToken,
    tablesRefreshToken,
    referringUserId,
  }: SignUpResponseParams): Promise<AuthenticationResponse> {
    const authnResponse = await hooks.get().postSignUp({
      user,
      tablesAccessToken,
      tablesRefreshToken,
      referringUserId,
    });

    const userWithoutPassword = removePasswordPropFromUser(authnResponse.user);

    await saveNewsLetterSubscriber(user);

    return {
      ...userWithoutPassword,
      token: authnResponse.token,
      projectId: authnResponse.project.id,
      projectRole: authnResponse.projectRole,
      tablesRefreshToken: authnResponse.tablesRefreshToken,
    };
  },

  async signInResponse({
    user,
    tablesAccessToken,
    tablesRefreshToken,
  }: SignInResponseParams): Promise<AuthenticationResponse> {
    const authnResponse = await hooks.get().postSignIn({
      user,
      tablesAccessToken,
      tablesRefreshToken,
    });

    const userWithoutPassword = removePasswordPropFromUser(authnResponse.user);

    return {
      ...userWithoutPassword,
      token: authnResponse.token,
      projectId: authnResponse.project.id,
      projectRole: authnResponse.projectRole,
      tablesRefreshToken: authnResponse.tablesRefreshToken,
    };
  },
};

const createUser = async (params: SignUpParams): Promise<User> => {
  try {
    const newUser: NewUser = {
      email: params.email,
      organizationRole: OrganizationRole.MEMBER,
      verified: params.verified,
      status: UserStatus.ACTIVE,
      firstName: params.firstName,
      lastName: params.lastName,
      trackEvents: params.trackEvents,
      newsLetter: params.newsLetter,
      password: params.password,
      organizationId: params.organizationId,
    };

    const user = await userService.create(newUser);

    return user;
  } catch (e: unknown) {
    if (e instanceof QueryFailedError) {
      throw new ApplicationError({
        code: ErrorCode.EXISTING_USER,
        params: {
          email: params.email,
          organizationId: params.organizationId,
        },
      });
    }

    throw e;
  }
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

async function saveNewsLetterSubscriber(user: User): Promise<void> {
  const isOrganizationUserOrNotSubscribed =
    (!isNil(user.organizationId) &&
      !flagService.isCloudOrganization(user.organizationId)) ||
    !user.newsLetter;
  const environment = system.get(SharedSystemProp.ENVIRONMENT);
  if (
    isOrganizationUserOrNotSubscribed ||
    environment !== EnvironmentType.PRODUCTION
  ) {
    return;
  }
  try {
    const response = await fetch('/addContact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: user.email }),
    });
    return await response.json();
  } catch (error) {
    logger.warn(error);
  }
}

type NewUser = Omit<User, 'id' | 'created' | 'updated'>;

type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  trackEvents: boolean;
  newsLetter: boolean;
  verified: boolean;
  organizationId: string | null;
  referringUserId?: string;
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

type SignUpResponseParams = {
  user: User;
  tablesAccessToken: string;
  tablesRefreshToken: string;
  referringUserId?: UserId;
};

type SignInResponseParams = {
  user: User;
  tablesAccessToken: string;
  tablesRefreshToken: string;
};
