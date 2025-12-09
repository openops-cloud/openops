import { User, UserWithOrganization } from '@openops/shared';
import { getProjectAndToken } from './context/create-project-auth-context';
import { addUserToDefaultWorkspace } from './new-user/organization-assignment';
import { ProjectContext } from './types';

export type ProjectAndTokenService = {
  fetch(user: User, tablesRefreshToken: string): Promise<ProjectContext>;
};

export type UserCreatedHook = { execute: () => Promise<void> | void };

export function getProjectAndTokenService(): ProjectAndTokenService {
  return { fetch: getProjectAndToken };
}

export function getUserCreatedHook(
  userWithOrganization: UserWithOrganization,
): UserCreatedHook {
  return {
    execute: async (): Promise<void> => {
      await addUserToDefaultWorkspace(userWithOrganization);
    },
  };
}
