import { cryptoUtils } from '@openops/server-shared';
import {
  ApplicationError,
  assertValidEmail,
  assertValidPassword,
  ErrorCode,
  isEmpty,
  OrganizationRole,
  User,
  UserStatus,
} from '@openops/shared';
import { QueryFailedError } from 'typeorm';
import { openopsTables } from '../../openops-tables';
import { userService } from '../../user/user-service';
import { Provider } from '../authentication-service/hooks/authentication-service-hooks';

type NewUserParams = {
  email: string;
  firstName: string;
  lastName: string;
  trackEvents: boolean;
  newsLetter: boolean;
  verified: boolean;
  organizationId: string | null;
  referringUserId?: string;
  provider: Provider;
};

type NewUserResponse = {
  user: User;
  tablesRefreshToken: string;
};

const assertValidSignUpParams = async ({
  email,
  password,
  name,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<void> => {
  assertValidEmail(email);
  assertValidPassword(password);

  if (isEmpty(name)) {
    throw new ApplicationError({
      code: ErrorCode.INVALID_NAME_FOR_USER,
      params: {
        name,
        message: 'First name and last name were not provided correctly.',
      },
    });
  }
};

const createEditorUser = async (
  params: NewUserParams & {
    password: string;
  },
): Promise<User> => {
  try {
    const newUser = {
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

    return await userService.create(newUser);
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

async function createTablesUser(
  name: string,
  email: string,
  password: string,
): Promise<string> {
  const { refresh_token } = await openopsTables.createUser({
    name,
    email,
    password,
    authenticate: true,
  });

  return refresh_token;
}

export async function createUser(
  params: NewUserParams & {
    password: string;
  },
): Promise<NewUserResponse> {
  const name = `${params.firstName} ${params.lastName}`.trim();
  await assertValidSignUpParams({
    ...params,
    name,
  });

  const user = await createEditorUser(params);

  try {
    const tablesRefreshToken = await createTablesUser(
      name,
      params.email,
      params.password,
    );

    return {
      user,
      tablesRefreshToken,
    };
  } catch (e: unknown) {
    await userService.delete({
      id: user.id,
      organizationId: user.organizationId,
    });

    throw e;
  }
}

export async function createUserWithRandomPassword(
  params: NewUserParams,
): Promise<NewUserResponse> {
  const randomPassword = await cryptoUtils.generateRandomPassword();

  const name = `${params.firstName} ${params.lastName}`.trim();
  await assertValidSignUpParams({
    ...params,
    password: randomPassword,
    name,
  });

  const user = await createEditorUser({
    ...params,
    password: randomPassword,
  });

  try {
    const tablesRefreshToken = await createTablesUser(
      name,
      params.email,
      randomPassword,
    );

    return {
      user,
      tablesRefreshToken,
    };
  } catch (e: unknown) {
    await userService.delete({
      id: user.id,
      organizationId: user.organizationId,
    });

    throw e;
  }
}
