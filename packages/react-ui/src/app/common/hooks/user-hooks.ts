import { QueryKeys } from '@/app/constants/query-keys';
import { authenticationSession } from '@/app/lib/authentication-session';
import { usersApi } from '@/app/lib/users-api';
import { useQuery } from '@tanstack/react-query';

export const userHooks = {
  useUserMeta: () => {
    const { data, isPending } = useQuery({
      queryKey: [QueryKeys.userMetadata],
      queryFn: usersApi.me,
      enabled: authenticationSession.isLoggedIn(),
    });

    return {
      userMeta: data,
      isPending,
    };
  },
};
