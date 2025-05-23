import { platformApi } from '@/app/lib/platforms-api';
import { usePrefetchQuery, useSuspenseQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/app/constants/query-keys';

export const platformHooks = {
  prefetchPlatform: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    usePrefetchQuery({
      queryKey: [QueryKeys.organization],
      queryFn: platformApi.getCurrentOrganization,
      staleTime: Infinity,
    });
  },
  useCurrentPlatform: () => {
    const query = useSuspenseQuery({
      queryKey: [QueryKeys.organization],
      queryFn: platformApi.getCurrentOrganization,
      staleTime: Infinity,
    });
    return {
      platform: query.data,
      refetch: async () => {
        await query.refetch();
      },
    };
  },
};
