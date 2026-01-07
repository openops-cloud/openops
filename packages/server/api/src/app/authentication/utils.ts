import {
  ApplicationError,
  AuthenticationResponse,
  ErrorCode,
  isNil,
  User,
  UserStatus,
} from '@openops/shared';
import { passwordHasher } from './basic/password-hasher';
import { AssertPasswordsMatchParams, ProjectContext } from './types';

const removePasswordPropFromUser = (user: User): Omit<User, 'password'> => {
  const { password: _, ...filteredUser } = user;
  return filteredUser;
};

export const assertUserIsAllowedToSignIn: (
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

export const assertPasswordMatches = async ({
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

export function buildAuthResponse(
  projectContext: ProjectContext,
): AuthenticationResponse {
  const userWithoutPassword = removePasswordPropFromUser(projectContext.user);

  return {
    ...userWithoutPassword,
    token: projectContext.token,
    projectId: projectContext.project.id,
    projectRole: projectContext.projectRole,
    isMasterProject: projectContext.isMasterProject,
    tablesRefreshToken: projectContext.tablesRefreshToken,
    tablesWorkspaceId: projectContext.project.tablesWorkspaceId,
  };
}
