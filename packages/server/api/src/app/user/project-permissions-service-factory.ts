import {
  projectPermissionsService,
  ProjectPermissionsService,
} from './project-permissions-service';

export const getProjectPermissionsService = (): ProjectPermissionsService => {
  return projectPermissionsService;
};
