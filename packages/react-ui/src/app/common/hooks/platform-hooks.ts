import { QueryKeys } from '@/app/constants/query-keys';
import { platformApi } from '@/app/lib/platforms-api';
import {
  QueryClient,
  usePrefetchQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { compare, validate } from 'compare-versions';

const fetchPlatformMetadataOptions = {
  queryKey: ['platform-metadata'],
  queryFn: platformApi.getPlatformMetadata,
  staleTime: Infinity,
};

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
  prefetchPlatformMetadata: (queryClient: QueryClient) => {
    queryClient.prefetchQuery(fetchPlatformMetadataOptions);
  },
  usePlatformVersion: () => {
    return useQuery({
      ...fetchPlatformMetadataOptions,
      select: (data) => data.version,
    });
  },
  useHasNewerAvailableVersion: () => {
    const { data: latestReleaseData } = useQuery({
      queryKey: ['latest-release'],
      queryFn: platformApi.getLatestRelease,
      staleTime: Infinity,
    });

    const { data: platformVersionData } = platformHooks.usePlatformVersion();

    if (
      !latestReleaseData?.name ||
      !validate(latestReleaseData.name) ||
      !platformVersionData ||
      !validate(platformVersionData)
    ) {
      return false;
    }

    return compare(latestReleaseData.name, platformVersionData, '>');
  },
};
