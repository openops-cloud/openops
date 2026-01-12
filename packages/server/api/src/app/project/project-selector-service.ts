import { Project } from '@openops/shared';
import { IsNull } from 'typeorm';
import { projectRepo } from './project-service';

export const projectSelectorService = {
  async getDefaultProjectForOrganization(
    organizationId: string,
  ): Promise<Project | null> {
    return projectRepo().findOne({
      where: {
        organizationId,
        deleted: IsNull(),
      },
      order: {
        created: 'ASC',
      },
    });
  },
};
