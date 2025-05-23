import { QueryKeys } from '@/app/constants/query-keys';
import {
  CardList,
  CardListEmpty,
  CardListItemSkeleton,
  ScrollArea,
  ScrollBar,
  SidebarHeader,
} from '@openops/components/ui';
import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import React from 'react';

import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { flowRunsApi } from '@/app/features/flow-runs/lib/flow-runs-api';
import { FlowRun, SeekPage } from '@openops/shared';
import { LeftSideBarType } from '../builder-types';

import { FlowRunCard } from './flow-run-card';

type FlowRunsListProps = {
  recentRuns?: number;
};

const FlowRecentRunsList = React.memo(
  ({ recentRuns = 20 }: FlowRunsListProps) => {
    const [flow, setLeftSidebar] = useBuilderStateContext((state) => [
      state.flow,
      state.setLeftSidebar,
    ]);

    const {
      data: flowPage,
      isLoading,
      isError,
    } = useQuery<SeekPage<FlowRun>, Error>({
      queryKey: [QueryKeys.flowRuns, flow.id],
      queryFn: () =>
        flowRunsApi.list({
          flowId: [flow.id],
          limit: recentRuns,
          cursor: undefined,
        }),
      staleTime: 15 * 1000,
    });

    return (
      <>
        <SidebarHeader onClose={() => setLeftSidebar(LeftSideBarType.NONE)}>
          {t('Recent Runs')}
        </SidebarHeader>
        <CardList>
          {isLoading && <CardListItemSkeleton numberOfCards={10} />}
          {isError && <div>{t('Error, please try again.')}</div>}
          {flowPage && flowPage.data.length === 0 && (
            <CardListEmpty message={t('No runs found')} />
          )}

          <ScrollArea className="w-full h-full">
            {flowPage &&
              flowPage.data.map((flowRun: FlowRun) => (
                <FlowRunCard run={flowRun} key={flowRun.id}></FlowRunCard>
              ))}
            <ScrollBar />
          </ScrollArea>
        </CardList>
      </>
    );
  },
);

FlowRecentRunsList.displayName = 'FlowRecentRunsList';
export { FlowRecentRunsList };
