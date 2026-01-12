import { Project } from '@openops/shared';
import { projectSelectorService } from './project-selector-service';

export type ProjectSelectorService = {
  getDefaultProjectForOrganization(
    organizationId: string,
  ): Promise<Project | null>;
};

export const getProjectSelectorService = (): ProjectSelectorService => {
  return projectSelectorService;
};
