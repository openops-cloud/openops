import { AuthenticationResponse } from '@openops/shared';
import { api } from './api';

export const projectAuth = {
  getTokenForProject: async (projectId: string) => {
    return api.post<AuthenticationResponse>(
      `/v1/users/projects/${projectId}/token`,
      {
        projectId,
      },
    );
  },
};
