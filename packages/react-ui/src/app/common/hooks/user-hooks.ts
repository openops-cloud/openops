import { QueryKeys } from '@/app/constants/query-keys';
import { usersApi } from '@/app/lib/users-api';
import { useQuery } from '@tanstack/react-query';

export const userHooks = {
  useUserMeta: () => {
    const { data } = useQuery({
      queryKey: [QueryKeys.userMetadata],
      queryFn: usersApi.me,
    });

    return {
      userMeta: data,
    };
  },
};
