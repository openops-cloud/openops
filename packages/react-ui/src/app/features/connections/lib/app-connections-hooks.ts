import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import {
  AppConnectionWithoutSensitiveData,
  ListAppConnectionsRequestQuery,
} from '@openops/shared';
import { appConnectionsApi } from './app-connections-api';

export const appConnectionsHooks = {
  useConnections: (request: ListAppConnectionsRequestQuery) => {
    return useQuery({
      queryKey: [QueryKeys.appConnections, request?.blockNames],
      queryFn: () => {
        return appConnectionsApi.list(request);
      },
      staleTime: 0,
    });
  },
  useConnection: (request: { id: string | null }) => {
    return useQuery({
      queryKey: [QueryKeys.appConnection, request.id],
      queryFn: () => {
        if (request.id === null) {
          return null;
        }
        return appConnectionsApi.get(request.id);
      },
      staleTime: 0,
    });
  },
  useGroupedConnections: (request: ListAppConnectionsRequestQuery) => {
    return useQuery({
      queryKey: [QueryKeys.appConnections, request?.blockNames],
      queryFn: () => appConnectionsApi.list(request),
      staleTime: 0,
      select: (connectionsPage) =>
        connectionsPage.data.reduce<
          Record<string, AppConnectionWithoutSensitiveData[]>
        >((acc, connection) => {
          if (!acc[connection.blockName]) {
            acc[connection.blockName] = [];
          }
          acc[connection.blockName].push(connection);
          return acc;
        }, {}),
    });
  },
};
