import { QueryKeys } from '@/app/constants/query-keys';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { oauthApi, OAuthConsentRequest } from '../lib/oauth-api';

type UseOAuthConsent = {
  request: OAuthConsentRequest | undefined;
  isLoading: boolean;
  loadError: Error | null;
  approve: () => void;
  deny: () => void;
  isDeciding: boolean;
  decisionError: Error | null;
};

/**
 * Loads a pending authorization request and records the user's decision.
 *
 * The request is single-use: the server consumes it when a decision arrives, so this
 * never retries and never refetches. A second read would fail, and a second decision
 * is exactly what the single-use record exists to prevent.
 */
export const useOAuthConsent = (requestId: string | null): UseOAuthConsent => {
  const {
    data: request,
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: [QueryKeys.oauthConsentRequest, requestId],
    queryFn: () => oauthApi.getConsentRequest(requestId as string),
    enabled: Boolean(requestId),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const {
    mutate,
    isPending: isDeciding,
    error: decisionError,
  } = useMutation({
    mutationFn: (approve: boolean) =>
      oauthApi.decide(requestId as string, approve),
    onSuccess: ({ redirectTo }) => {
      // A full navigation, not a router push: the destination belongs to the client
      // that started the flow. The server only ever returns a registered redirect URI.
      window.location.assign(redirectTo);
    },
  });

  const approve = useCallback(() => mutate(true), [mutate]);
  const deny = useCallback(() => mutate(false), [mutate]);

  return {
    request,
    isLoading: requestId !== null && isLoading,
    loadError: loadError as Error | null,
    approve,
    deny,
    isDeciding,
    decisionError: decisionError as Error | null,
  };
};
