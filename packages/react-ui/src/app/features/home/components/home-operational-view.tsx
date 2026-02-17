import { HomeFlowsTable } from '@/app/features/home/flows-table';
import {
  useDashboardData,
  useWorkflowsOverview,
} from '@/app/features/home/lib/home-hooks';
import { HomeRunsTable } from '@/app/features/home/runs-table';
import { FinOpsBenchmarkBanner, OverviewCard } from '@openops/components/ui';
import { subDays } from 'date-fns';
import { t } from 'i18next';
import {
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CircleCheckBig,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOpenBenchmarkWizard } from './use-open-benchmark-wizard';
import { useShowBenchmarkBanner } from './useShowBenchmarkBanner';

type HomeOperationalViewProps = {
  onExploreTemplatesClick: () => void;
};

const HomeOperationalView = ({
  onExploreTemplatesClick,
}: HomeOperationalViewProps) => {
  const navigate = useNavigate();
  const {
    runsResponse,
    runsLoading,
    flowsResponse,
    isLoadingFlows,
    existingFlowsResponse,
    refetchFlows,
    refetchRuns,
  } = useDashboardData();

  const { overviewResponse } = useWorkflowsOverview(
    subDays(new Date(), 7),
    new Date(),
  );

  const flowsExist = !!existingFlowsResponse?.data?.length;

  const isFinOpsBenchmarkEnabled = useShowBenchmarkBanner();
  const openBenchmarkWizard = useOpenBenchmarkWizard();

  return (
    <>
      {overviewResponse && (
        <div className="flex items-center gap-6">
          <OverviewCard
            title={t('Activated workflows')}
            icon={<CircleCheckBig />}
            value={overviewResponse.activatedWorkflows}
            bottomLineText={t('Out of {n} created', {
              n: overviewResponse.totalWorkflows,
            })}
            iconWrapperClassName="bg-success-400"
            onClick={() => {
              navigate('/flows?status=ENABLED');
            }}
          />
          <OverviewCard
            title={t('Total runs')}
            icon={<CalendarClock />}
            value={overviewResponse.totalRuns}
            bottomLineText={t('Last week')}
            iconWrapperClassName="bg-blueAccent-400"
            onClick={() => {
              navigate('/runs');
            }}
          />
          <OverviewCard
            title={t('Successful runs')}
            icon={<CalendarCheck2 />}
            value={overviewResponse.successfulRuns}
            bottomLineText={t('Last week')}
            iconWrapperClassName="bg-success-400"
            onClick={() => {
              navigate('/runs?status=SUCCEEDED');
            }}
          />
          <OverviewCard
            title={t('Failed runs')}
            icon={<CalendarX2 />}
            value={overviewResponse.failedRuns}
            bottomLineText={t('Last week')}
            iconWrapperClassName="bg-destructive-400"
            onClick={() => {
              navigate('/runs?status=FAILED');
            }}
          />
        </div>
      )}

      {isFinOpsBenchmarkEnabled && (
        <FinOpsBenchmarkBanner onActionClick={openBenchmarkWizard} />
      )}

      <HomeFlowsTable
        data={flowsResponse?.data || []}
        flowsExist={flowsExist}
        loading={isLoadingFlows}
        refetch={refetchFlows}
        onExploreTemplatesClick={onExploreTemplatesClick}
      />

      <HomeRunsTable
        data={runsResponse?.data || []}
        loading={runsLoading}
        refetch={refetchRuns}
      />
    </>
  );
};

HomeOperationalView.displayName = 'HomeOperationalView';
export { HomeOperationalView };
