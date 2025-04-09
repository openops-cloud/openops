import { createAxiosHeaders } from '@openops/common';
import { resilientPost } from './utils';

export async function addUserToWorkspace(
  token: string,
  values: {
    email: string;
    workspaceId: number;
    permissions?: 'MEMBER' | 'ADMIN';
  },
): Promise<{ name: string; id: number }> {
  const requestBody = {
    email: values.email,
    permissions: values.permissions ?? 'MEMBER',
  };

  const addUserToWorkspaceEndpoint = `api/workspaces/${values.workspaceId}/user/`;
  return resilientPost(
    addUserToWorkspaceEndpoint,
    requestBody,
    createAxiosHeaders(token),
  ) as Promise<{ name: string; id: number }>;
}
