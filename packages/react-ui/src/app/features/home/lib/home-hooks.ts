import { QueryKeys } from '@/app/constants/query-keys';
import {
  DashboardOverview,
  FlowRun,
  PopulatedFlow,
  SeekPage,
  WorkflowStats,
} from '@openops/shared';
import { useQuery } from '@tanstack/react-query';

import { flowRunsApi } from '@/app/features/flow-runs/lib/flow-runs-api';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { authenticationSession } from '@/app/lib/authentication-session';
import { homeApi } from './home-api';

export const useDashboardData = () => {
  const { data: runsResponse, isLoading: runsLoading } = useQuery<
    SeekPage<FlowRun>,
    Error
  >({
    queryKey: [QueryKeys.homeRuns],
    queryFn: fetchRuns,
  });

  const {
    data: flowsResponse,
    isLoading: isLoadingFlows,
    refetch: refetchFlows,
  } = useQuery<SeekPage<PopulatedFlow>, Error>({
    queryKey: [QueryKeys.homeFlowsRecent],
    queryFn: () => fetchFlows(10),
  });

  const { data: existingFlowsResponse, isLoading: isLoadingExistingFlows } =
    useQuery<SeekPage<PopulatedFlow>, Error>({
      queryKey: [QueryKeys.homeFlows, flowsResponse],
      enabled: !!flowsResponse,
      queryFn: () => fetchFlows(1),
    });

  return {
    runsResponse,
    runsLoading,
    flowsResponse,
    isLoadingFlows: isLoadingFlows || isLoadingExistingFlows,
    existingFlowsResponse,
    refetchFlows,
  };
};

export const useAnalyticsOverview = () => {
  const { data: overviewResponse, isLoading: isOverviewLoading } = useQuery<
    DashboardOverview,
    Error
  >({
    queryKey: [QueryKeys.homeAnalyticsOverview],
    queryFn: homeApi.getAnalyticsOverview,
  });

  return { overviewResponse, isOverviewLoading };
};

export const useWorkflowsOverview = (
  createdAfter: Date,
  createdBefore: Date,
) => {
  const { data: overviewResponse, isLoading: isOverviewLoading } = useQuery<
    WorkflowStats,
    Error
  >({
    queryKey: [QueryKeys.homeWorkflowsOverview],
    queryFn: () =>
      homeApi.getWorkflowsdOverview({ createdAfter, createdBefore }),
  });

  return { overviewResponse, isOverviewLoading };
};

const fetchRuns = async () => {
  return flowRunsApi.list({
    projectId: authenticationSession.getProjectId()!,
    limit: 10,
  });
};

const fetchFlows = async (
  limit = 10,
  showPublihedFlowsWithDrafts?: boolean,
) => {
  return flowsApi.list({
    projectId: authenticationSession.getProjectId()!,
    limit: limit,
    cursor: undefined,
  });
};
