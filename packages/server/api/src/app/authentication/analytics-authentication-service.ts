import {
  AnalyticsAuthTokens,
  authenticateOpenOpsAnalyticsAdmin,
  authenticateUserInOpenOpsTables,
} from '@openops/common';
import {
  ApplicationError,
  assertNotNullOrUndefined,
  ErrorCode,
} from '@openops/shared';
import { seedAnalyticsDashboards } from '../openops-analytics/analytics-seeding-service';
import { projectService } from '../project/project-service';
import { userService } from '../user/user-service';
import { getProjectAndToken } from './context/create-project-auth-context';
import { ProjectContext } from './types';

export type AnalyticsAccessContext = {
  authTokens: AnalyticsAuthTokens;
  projectContext: ProjectContext;
};

export const analyticsAuthenticationService = {
  async signUp(): Promise<AnalyticsAuthTokens> {
    await seedAnalyticsDashboards();

    return authenticateOpenOpsAnalyticsAdmin();
  },

  async signIn(): Promise<AnalyticsAuthTokens> {
    return authenticateOpenOpsAnalyticsAdmin();
  },

  async verifyUserAnalyticsAccess(
    openopsUserId: string,
  ): Promise<ProjectContext> {
    const user = await userService.getOneOrThrow({
      id: openopsUserId,
    });

    const tokens = await authenticateUserInOpenOpsTables(
      user.email,
      user.password,
    );

    const projectContext = await getProjectAndToken(user, tokens.refresh_token);

    if (!projectContext.hasAnalyticsPrivileges) {
      throw new ApplicationError({
        code: ErrorCode.AUTHORIZATION,
        params: {
          message: 'Project does not have analytics privileges',
        },
      });
    }

    return projectContext;
  },

  async authenticateAnalyticsRequest(
    userId: string,
  ): Promise<AnalyticsAccessContext> {
    const projectContext = await this.verifyUserAnalyticsAccess(userId);
    const authTokens = await this.signIn();

    return {
      authTokens,
      projectContext,
    };
  },
};
