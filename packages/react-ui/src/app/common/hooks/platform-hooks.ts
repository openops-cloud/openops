import { QueryKeys } from '@/app/constants/query-keys';
import { platformApi } from '@/app/lib/platforms-api';
import {
  QueryClient,
  usePrefetchQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { compare, validate } from 'compare-versions';

const fetchNewerVersionOptions = {
  queryKey: [QueryKeys.platformMetadata, QueryKeys.latestRelease],
  queryFn: async () => {
    const [platformMetadata, latestRelease] = await Promise.all([
      platformApi.getPlatformMetadata(),
      platformApi.getLatestRelease().catch(() => null),
    ]);
    return {
      currentVersion: platformMetadata.version,
      latestVersion: latestRelease?.name ?? null,
    };
  },
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
  prefetchNewerVersionInfo: (queryClient: QueryClient) => {
    queryClient.prefetchQuery(fetchNewerVersionOptions);
  },
  useNewerAvailableVersion: () => {
    const queryResult = useQuery(fetchNewerVersionOptions);

    const { data } = queryResult;

    if (
      !data?.currentVersion ||
      data.currentVersion.includes('-') ||
      !validate(data.currentVersion) ||
      !data.latestVersion ||
      !validate(data.latestVersion)
    ) {
      return { queryResult, hasNewerVersionAvailable: false };
    }

    const hasNewerVersionAvailable = compare(
      data.latestVersion,
      data.currentVersion,
      '>',
    );
    return {
      queryResult,
      hasNewerVersionAvailable,
    };
  },
};
