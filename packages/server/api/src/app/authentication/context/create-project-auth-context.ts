import {
  ApplicationError,
  ErrorCode,
  isNil,
  PrincipalType,
  ProjectMemberRole,
  User,
} from '@openops/shared';
import { organizationService } from '../../organization/organization.service';
import { projectService } from '../../project/project-service';
import { userService } from '../../user/user-service';
import { ProjectContext } from '../types';
import { accessTokenManager } from './access-token-manager';

export async function getProjectAndToken(
  user: User,
  tablesRefreshToken: string,
  expiresInSeconds?: number,
): Promise<ProjectContext> {
  const updatedUser = await userService.getOneOrThrow({ id: user.id });

  const project = await projectService.getOneForUser(updatedUser);
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

  const token = await accessTokenManager.generateToken(
    {
      id: user.id,
      externalId: user.externalId,
      type: PrincipalType.USER,
      projectId: project.id,
      organization: {
        id: organization.id,
      },
    },
    expiresInSeconds,
  );

  return {
    user: updatedUser,
    token,
    project,
    tablesRefreshToken,
    hasTemplatesPrivileges: true,
    hasAnalyticsPrivileges: true,
    projectRole: ProjectMemberRole.ADMIN,
  };
}
