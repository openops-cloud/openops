import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import {
  AppConnectionWithoutSensitiveData,
  ListAppConnectionsRequestQuery,
  SeekPage,
} from '@openops/shared';
import { appConnectionsApi } from './app-connections-api';

/**
 * Maximum number of connections to fetch when we want to get all connections.
 * This value is high enough to ensure we get all connections in practice.
 */
export const FETCH_ALL_CONNECTIONS_LIMIT = 100;

export const appConnectionsHooks = {
  useConnections: (request: ListAppConnectionsRequestQuery) => {
    return useQuery({
      queryKey: [QueryKeys.appConnections, request?.authProviders],
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
  useConnectionByName: ({ name }: { name?: string }) => {
    return useQuery({
      queryKey: [QueryKeys.appConnection, name],
      queryFn: () => {
        if (!name) {
          return null;
        }
        return appConnectionsApi.getByName(name);
      },
      staleTime: 0,
    });
  },
  useGroupedConnections: (request: ListAppConnectionsRequestQuery) => {
    return useQuery({
      queryKey: [QueryKeys.appConnections, request?.authProviders],
      queryFn: () => appConnectionsApi.list(request),
      staleTime: 0,
      select: groupedConnectionsSelector,
    });
  },
  useConnectionsMetadata: () => {
    return useQuery({
      queryKey: [QueryKeys.appConnections, 'metadata'],
      queryFn: () => appConnectionsApi.getMetadata(),
      staleTime: Infinity,
    });
  },
};

export const groupedConnectionsSelector = (
  connectionsPage: SeekPage<AppConnectionWithoutSensitiveData>,
): Record<string, AppConnectionWithoutSensitiveData[]> => {
  return connectionsPage.data.reduce<
    Record<string, AppConnectionWithoutSensitiveData[]>
  >((acc, connection) => {
    if (connection.authProviderKey && !acc[connection.authProviderKey]) {
      acc[connection.authProviderKey] = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    acc[connection.authProviderKey!].push(connection);
    return acc;
  }, {});
};
