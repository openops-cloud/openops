import { createAxiosHeaders } from '@openops/common';
import { resilientPost } from './utils';

export type Workspace = {
  id: number;
  name: string;
  order: number;
  permissions: string;
};

export async function createWorkspace(
  workspaceName: string,
  token: string,
): Promise<Workspace> {
  const requestBody = {
    name: workspaceName,
  };

  const createWorkspaceEndpoint = 'api/workspaces/';
  return resilientPost(
    createWorkspaceEndpoint,
    requestBody,
    createAxiosHeaders(token),
  ) as Promise<Workspace>;
}
