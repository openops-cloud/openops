import { QueryKeys } from '@/app/constants/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ConnectedApp, oauthApi } from '../lib/oauth-api';

type UseConnectedApps = {
  apps: ConnectedApp[] | undefined;
  isLoading: boolean;
  loadError: Error | null;
  revoke: (grantId: string) => void;
  revokingId: string | null;
  revokeError: Error | null;
};

/**
 * The applications this user has connected, and the ability to disconnect one.
 *
 * Each row is a separate authorization rather than a separate application: connecting
 * the same client twice produces two, and revoking one leaves the other working.
 */
export const useConnectedApps = (): UseConnectedApps => {
  const queryClient = useQueryClient();

  const {
    data: apps,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: [QueryKeys.connectedApps],
    queryFn: oauthApi.listConnectedApps,
  });

  const {
    mutate,
    variables: revokingId,
    isPending: isRevoking,
    error: revokeError,
  } = useMutation({
    mutationFn: oauthApi.revokeConnectedApp,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKeys.connectedApps] }),
  });

  const revoke = useCallback((grantId: string) => mutate(grantId), [mutate]);

  return {
    apps,
    isLoading,
    loadError: loadError as Error | null,
    revoke,
    revokingId: isRevoking ? revokingId ?? null : null,
    revokeError: revokeError as Error | null,
  };
};
