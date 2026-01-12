import { Project } from '@openops/shared';
import { projectService } from '../project/project-service';

export const getDefaultProjectForOrganization = (
  organizationId: string,
): Promise<Project | null> => {
  return projectService.getOneForOrganization(organizationId);
};
