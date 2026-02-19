import {
  AppConnectionStatus,
  AppConnectionWithoutSensitiveData,
} from '@openops/shared';

import {
  appConnectionsHooks,
  FETCH_ALL_CONNECTIONS_LIMIT,
} from '@/app/features/connections/lib/app-connections-hooks';

import {
  getEnabledAuthProviders,
  getEnabledProviders,
} from './cloud-providers';

function buildConnectedProvidersMap(
  groupedConnections:
    | Record<string, AppConnectionWithoutSensitiveData[]>
    | undefined,
): Record<string, boolean> {
  return Object.fromEntries(
    getEnabledProviders().map((p) => [
      p.value,
      (groupedConnections?.[p.authProviderKey] ?? []).some(
        (c) => c.status === AppConnectionStatus.ACTIVE,
      ),
    ]),
  );
}

export function useProviderConnections() {
  const { data: groupedConnections, refetch: refetchConnections } =
    appConnectionsHooks.useGroupedConnections({
      authProviders: getEnabledAuthProviders(),
      limit: FETCH_ALL_CONNECTIONS_LIMIT,
    });

  const connectedProviders = buildConnectedProvidersMap(groupedConnections);

  return { connectedProviders, refetchConnections };
}
