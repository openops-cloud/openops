import { INTERNAL_ERROR_TOAST, toast } from '@openops/components/ui';
import { ListFlowsRequest, PopulatedFlow } from '@openops/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useState } from 'react';
import { NavigateFunction } from 'react-router-dom';

import { flowsApi } from './flows-api';

import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { SEARCH_PARAMS } from '@/app/constants/search-params';
import { authenticationSession } from '@/app/lib/authentication-session';

export type FlowsSearchState = {
  searchTerm: string;
  loading: boolean;
  results: PopulatedFlow[];
};

async function fetchFlows(name: string, limit: number, signal: AbortSignal) {
  return flowsApi.list(
    {
      projectId: authenticationSession.getProjectId()!,
      limit: limit,
      name: name,
      cursor: undefined,
    },
    {
      signal,
    },
  );
}

export const flowsHooks = {
  useFlows: (request: Omit<ListFlowsRequest, 'projectId'>) => {
    return useQuery({
      queryKey: [QueryKeys.flows, authenticationSession.getProjectId()],
      queryFn: async () => {
        return await flowsApi.list({
          ...request,
          projectId: authenticationSession.getProjectId()!,
        });
      },
      staleTime: 5 * 1000,
    });
  },
  useFlowSearch: (paginationLimit: number) => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: reults, isLoading } = useQuery({
      queryKey: [QueryKeys.foldersFlowsSearch, searchTerm, paginationLimit],
      queryFn: async ({ signal }) => {
        if (!searchTerm) return { data: [] };
        return fetchFlows(searchTerm.trim(), paginationLimit, signal);
      },
      enabled: searchTerm.length > 0,
      staleTime: 5 * 1000,
      retry: false,
    });

    const searchState: FlowsSearchState = {
      searchTerm,
      loading: isLoading,
      results: reults?.data ?? [],
    };

    return {
      searchState,
      setSearchTerm,
    };
  },
  useCreateFlow: (navigate: NavigateFunction) => {
    const { updateHomePageOperationalViewFlag } =
      userSettingsHooks.useHomePageOperationalView();

    return useMutation<
      { flow: PopulatedFlow; folderId: string | undefined },
      Error,
      string | undefined
    >({
      mutationFn: async (folderId: string | undefined) => {
        const flow = await flowsApi.create({
          projectId: authenticationSession.getProjectId()!,
          displayName: t('Untitled'),
          folderId: folderId,
        });

        return { flow, folderId };
      },
      onSuccess: ({ flow, folderId }) => {
        updateHomePageOperationalViewFlag();
        if (folderId) {
          navigate(
            `/flows/${flow.id}?folderId=${folderId}&${SEARCH_PARAMS.viewOnly}=false`,
          );
        } else {
          navigate(`/flows/${flow.id}?${SEARCH_PARAMS.viewOnly}=false`);
        }
      },
      onError: () => toast(INTERNAL_ERROR_TOAST),
    });
  },
};
