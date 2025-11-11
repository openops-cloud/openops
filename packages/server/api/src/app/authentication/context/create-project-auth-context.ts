import {
  ApplicationError,
  ErrorCode,
  isNil,
  PrincipalType,
  Project,
  ProjectMemberRole,
  User,
} from '@openops/shared';
import { organizationService } from '../../organization/organization.service';
import { userService } from '../../user/user-service';
import { accessTokenManager } from './access-token-manager';

export async function createProjectAuthContext(
  user: User,
  tablesRefreshToken: string,
  getProjectStrategy: (user: User) => Promise<Project | null>,
): Promise<{
  user: User;
  project: Project;
  token: string;
  tablesRefreshToken: string;
  projectRole: ProjectMemberRole;
}> {
  const updatedUser = await userService.getOneOrFail({ id: user.id });

  const project = await getProjectStrategy(updatedUser);

  if (isNil(project)) {
    throw new ApplicationError({
      code: ErrorCode.INVITATION_ONLY_SIGN_UP,
      params: {
        message: 'No project found for user',
      },
    });
  }

  const organization = await organizationService.getOneOrThrow(
    project.organizationId,
  );

  const token = await accessTokenManager.generateToken({
    id: user.id,
    type: PrincipalType.USER,
    projectId: project.id,
    organization: {
      id: organization.id,
    },
  });

  return {
    user: updatedUser,
    token,
    project,
    tablesRefreshToken,
    projectRole: ProjectMemberRole.ADMIN,
  };
}
