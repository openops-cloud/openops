import {
  ApplicationError,
  InternalAuthenticationPayload,
  ErrorCode,
  isNil,
  User,
  UserStatus,
} from '@openops/shared';
import { passwordHasher } from './basic/password-hasher';
import { AssertPasswordsMatchParams, ProjectContext } from './types';

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
): InternalAuthenticationPayload {
  return {
    ...projectContext.user,
    token: projectContext.token,
    projectId: projectContext.projectId,
    projectRole: projectContext.projectRole,
    tablesRefreshToken: projectContext.tablesRefreshToken,
    tablesWorkspaceId: projectContext.tablesWorkspaceId,
  };
}
