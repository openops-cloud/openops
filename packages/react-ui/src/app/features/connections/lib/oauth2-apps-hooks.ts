import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import { AppConnectionType } from '@openops/shared';

import { oauthAppsApi } from './oauth2-apps-api';

type BlockToClientIdMap = {
  [blockName: string]: {
    type: AppConnectionType.CLOUD_OAUTH2 | AppConnectionType.PLATFORM_OAUTH2;
    clientId: string;
  };
};

export const oauth2AppsHooks = {
  useBlockToClientIdMap(oauthProxyUrl: string | null) {
    return useQuery<BlockToClientIdMap, Error>({
      queryKey: [QueryKeys.oauthApps],
      queryFn: async () => {
        const apps = await oauthAppsApi.listCloudOAuthApps(oauthProxyUrl);
        const appsMap: BlockToClientIdMap = {};
        Object.keys(apps).forEach((key) => {
          appsMap[key] = {
            type: AppConnectionType.CLOUD_OAUTH2,
            clientId: apps[key].clientId,
          };
        });

        return appsMap;
      },
      staleTime: 0,
    });
  },
};
