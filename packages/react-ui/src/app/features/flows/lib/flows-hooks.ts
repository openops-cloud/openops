import {
  INTERNAL_ERROR_TOAST,
  StepMetadataWithSuggestions,
  toast,
} from '@openops/components/ui';
import { ListFlowsRequest, PopulatedFlow, RiskLevel } from '@openops/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { useMemo, useState } from 'react';
import { NavigateFunction } from 'react-router-dom';

import { flowsUtils } from '@/app/features/flows/lib/flows-utils';
import { flowsApi } from './flows-api';

import { userSettingsHooks } from '@/app/common/hooks/user-settings-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { SEARCH_PARAMS } from '@/app/constants/search-params';

export type FlowsSearchState = {
  searchTerm: string;
  loading: boolean;
  results: PopulatedFlow[];
};

async function fetchFlows(name: string, limit: number, signal: AbortSignal) {
  return flowsApi.list(
    {
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
  useFlows: (request: ListFlowsRequest) => {
    return useQuery({
      queryKey: [QueryKeys.flows, JSON.stringify(request)],
      queryFn: async () => {
        return await flowsApi.list(request);
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
  useIsRiskyAction: (
    metadata: StepMetadataWithSuggestions[] | undefined,

    blockName: string | undefined,
    actionName: string | undefined,
  ) => {
    return useMemo(() => {
      if (!metadata || !blockName || !actionName) return false;
      const actionMetadata = flowsUtils.getActionMetadata(
        metadata,
        blockName,
        actionName,
      );
      return actionMetadata?.riskLevel === RiskLevel.HIGH;
    }, [metadata, blockName, actionName]);
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
