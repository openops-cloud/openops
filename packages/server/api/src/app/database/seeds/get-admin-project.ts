import { Project, User } from '@openops/shared';
import { projectService } from '../../project/project-service';

export async function getAdminProject(user: User): Promise<Project | null> {
  return projectService.getOneForUser(user);
}
