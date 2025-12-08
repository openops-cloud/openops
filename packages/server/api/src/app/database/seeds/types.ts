import { User } from '@openops/shared';

export type EnsureProjectParams = {
  organizationId: string;
  user: User;
  databaseId: number;
  workspaceId: number;
  databaseToken: string;
};
