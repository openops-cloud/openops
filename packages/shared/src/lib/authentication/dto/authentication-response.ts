import { ProjectMemberRole } from '../../project';
import { User } from '../../user/user';

export type UserWithoutPassword = Omit<User, 'password'>;

export type AuthenticationResponse = UserWithoutPassword & {
  token: string;
  projectId: string;
  projectRole: ProjectMemberRole | null;
  tablesRefreshToken: string;
};

export const removePasswordPropFromUser = (user: User): UserWithoutPassword => {
  const { password: _, ...filteredUser } = user;
  return filteredUser;
};
