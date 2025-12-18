import {
  ApplicationError,
  assertValidEmail,
  assertValidPassword,
  ErrorCode,
  isEmpty,
  OrganizationRole,
  Provider,
  User,
  UserStatus,
} from '@openops/shared';
import { QueryFailedError } from 'typeorm';
import { openopsTables } from '../../openops-tables';
import { userService } from '../../user/user-service';

type NewUserParams = {
  email: string;
  firstName: string;
  lastName: string;
  trackEvents: boolean;
  newsLetter: boolean;
  verified: boolean;
  organizationId: string | null;
  provider: Provider;
  externalId?: string;
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
      externalId: params.externalId,
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
      user.password,
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
