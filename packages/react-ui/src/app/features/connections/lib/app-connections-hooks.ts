import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/app/constants/query-keys';
import {
  AppConnectionWithoutSensitiveData,
  ListAppConnectionsRequestQuery,
  SeekPage,
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
  useGroupedConnections: (
    request: ListAppConnectionsRequestQuery,
    useConnectionsProvider: boolean,
  ) => {
    return useQuery({
      queryKey: [QueryKeys.appConnections, request?.blockNames],
      queryFn: () => appConnectionsApi.list(request),
      staleTime: 0,
      select: useConnectionsProvider
        ? groupedConnectionsSelector
        : legacyGroupedConnectionsSelector,
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

/**
 * @deprecated
 */
const legacyGroupedConnectionsSelector = (
  connectionsPage: SeekPage<AppConnectionWithoutSensitiveData>,
): Record<string, AppConnectionWithoutSensitiveData[]> => {
  return connectionsPage.data.reduce<
    Record<string, AppConnectionWithoutSensitiveData[]>
  >((acc, connection) => {
    if (!acc[connection.blockName]) {
      acc[connection.blockName] = [];
    }
    acc[connection.blockName].push(connection);
    return acc;
  }, {});
};

export const groupedConnectionsSelector = (
  connectionsPage: SeekPage<AppConnectionWithoutSensitiveData>,
): Record<string, AppConnectionWithoutSensitiveData[]> => {
  const connectionsByProvider = connectionsPage.data.reduce<
    Record<string, AppConnectionWithoutSensitiveData[]>
  >((acc, connection) => {
    if (connection.authProviderKey && !acc[connection.authProviderKey]) {
      acc[connection.authProviderKey] = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    acc[connection.authProviderKey!].push(connection);
    return acc;
  }, {});

  const connectionsByBlock = connectionsPage.data.reduce<
    Record<string, AppConnectionWithoutSensitiveData[]>
  >((acc, connection) => {
    if (!acc[connection.blockName]) {
      acc[connection.blockName] = [];
    }

    if (acc[connection.blockName].length > 0) {
      return acc;
    }

    acc[connection.blockName].push(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...(connectionsByProvider[connection.authProviderKey!] ?? []),
    );
    return acc;
  }, {});

  return connectionsByBlock;
};
