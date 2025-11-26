import { useSuspenseQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import { flagsApi, FlagsMap } from '@/app/lib/flags-api';
import { FlagId, OpenOpsFlag } from '@openops/shared';

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
  useFlag: <T>(flagId: OpenOpsFlag) => {
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
    const cloudConnectionPageEnabled = flagsHooks.useFlag<boolean>(
      FlagId.CLOUD_CONNECTION_PAGE_ENABLED,
    ).data;
    const federatedLoginEnabled = flagsHooks.useFlag<boolean>(
      FlagId.FEDERATED_LOGIN_ENABLED,
    ).data;

    // Fetch cloud templates when cloud connection page is disabled
    // OR when federated login is enabled
    return !cloudConnectionPageEnabled || federatedLoginEnabled;
  },

  useShouldShowCloudUserInMenu: () => {
    const cloudConnectionPageEnabled = flagsHooks.useFlag<boolean>(
      FlagId.CLOUD_CONNECTION_PAGE_ENABLED,
    ).data;
    const federatedLoginEnabled = flagsHooks.useFlag<boolean>(
      FlagId.FEDERATED_LOGIN_ENABLED,
    ).data;

    // Show cloud user in menu only when:
    // - Cloud connection page is disabled AND federated login is also disabled
    return !cloudConnectionPageEnabled && !federatedLoginEnabled;
  },
};
