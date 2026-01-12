import { Project } from '@openops/shared';
import { projectService } from './project-service';

export type ProjectSelectorService = {
  getDefaultProjectForOrganization(
    organizationId: string,
  ): Promise<Project | null>;
};

export const getProjectSelectorService = (): ProjectSelectorService => {
  return {
    getDefaultProjectForOrganization: (organizationId: string) =>
      projectService.getOneForOrganization(organizationId),
  };
};
