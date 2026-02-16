import { api } from '@/app/lib/api';
import {
  ListProjectRequestForUserQueryParams,
  ProjectWithoutSensitiveData,
  SeekPage,
} from '@openops/shared';

export const projectApi = {
  current: async () => {
    return api.get<ProjectWithoutSensitiveData>('/v1/users/projects/current');
  },
  list(request: ListProjectRequestForUserQueryParams) {
    return api.get<SeekPage<ProjectWithoutSensitiveData>>(
      '/v1/users/projects',
      request,
    );
  },
  get: async (projectId: string) => {
    return api.get<ProjectWithoutSensitiveData>(
      `/v1/users/projects/${projectId}`,
    );
  },
  getAll: async () => {
    return api.get<ProjectWithoutSensitiveData[]>(`/v1/users/projects`);
  },
};
