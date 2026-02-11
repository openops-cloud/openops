import { api } from '@/app/lib/api';
import {
  ListProjectRequestForUserQueryParams,
  Project,
  SeekPage,
} from '@openops/shared';

export const projectApi = {
  current: async () => {
    return api.get<Project>('/v1/users/projects/current');
  },
  list(request: ListProjectRequestForUserQueryParams) {
    return api.get<SeekPage<Project>>('/v1/users/projects', request);
  },
  get: async (projectId: string) => {
    return api.get<Project>(`/v1/users/projects/${projectId}`);
  },
  getAll: async () => {
    return api.get<Project[]>(`/v1/users/projects`);
  },
};
