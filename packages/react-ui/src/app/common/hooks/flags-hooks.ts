import { usePrefetchQuery, useSuspenseQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import { flagsApi, FlagsMap } from '@/app/lib/flags-api';
import { FlagId } from '@openops/shared';

type WebsiteBrand = {
  websiteName: string;
  logos: {
    fullLogoUrl: string;
    favIconUrl: string;
    logoIconUrl: string;
    logoIconPositiveUrl: string;
    fullLogoPositiveUrl: string;
  };
  colors: {
    primary: {
      default: string;
      medium: string;
      dark: string;
      light: string;
    };
    green: {
      default: string;
      light: string;
      medium: string;
    };
  };
};

export const flagsHooks = {
  prefetchFlags: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    usePrefetchQuery<FlagsMap, Error>({
      queryKey: [QueryKeys.flags],
      queryFn: flagsApi.getAll,
      staleTime: Infinity,
    });
  },
  useFlags: () => {
    return useSuspenseQuery<FlagsMap, Error>({
      queryKey: [QueryKeys.flags],
      queryFn: flagsApi.getAll,
      staleTime: Infinity,
    });
  },
  useWebsiteBranding: () => {
    const { data: theme } = flagsHooks.useFlag<WebsiteBrand>(FlagId.THEME);
    return theme!;
  },
  useFlag: <T>(flagId: FlagId) => {
    const data = useSuspenseQuery<FlagsMap, Error>({
      queryKey: [QueryKeys.flags],
      queryFn: flagsApi.getAll,
      staleTime: Infinity,
    }).data?.[flagId] as T | null;
    return {
      data,
    };
  },
  useShouldFetchCloudTemplates: () => {
    return (
      !flagsHooks.useFlag<boolean>(FlagId.CLOUD_CONNECTION_PAGE_ENABLED).data ||
      false
    );
  },
};
