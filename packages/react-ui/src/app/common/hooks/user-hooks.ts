import { usersApi } from '@/app/lib/users-api';
import { useQuery } from '@tanstack/react-query';

export const userHooks = {
  useUserMeta: () => {
    const { data } = useQuery({
      queryKey: ['user-meta'],
      queryFn: usersApi.me,
    });

    return {
      userMeta: data,
    };
  },
};
