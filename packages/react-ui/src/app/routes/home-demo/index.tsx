import { DasbhoardOverview, PageHeader } from '@openops/components/ui';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';

import { CreateNewFlowInFolder } from '@/app/features/flows/components/create-new-flow-in-folder';
import { HomeFlowsTable } from '@/app/features/home/flows-table';
import {
  useAnalyticsOverview,
  useDashboardData,
} from '@/app/features/home/lib/home-hooks';
import {
  formatCurrency,
  formatNumber,
} from '@/app/features/home/lib/home-utils';
import { HomeRunsTable } from '@/app/features/home/runs-table';

const DEFAULT_DATABASE_ID = 1;

const HomeDemoPage = () => {
  const navigate = useNavigate();
  const {
    runsResponse,
    runsLoading,
    flowsResponse,
    isLoadingFlows,
    existingFlowsResponse,
    refetchFlows,
  } = useDashboardData();

  const { overviewResponse, isOverviewLoading } = useAnalyticsOverview();

  const flowsExist = !!existingFlowsResponse?.data?.length;

  const getUnnaddressedSavingsPlaceholderText = () => {
    if (flowsExist) {
      return t('Connect to tables to track savings.');
    }
    return t('Create and run workflows to discover saving opportunities.');
  };

  const onOpportunitiesCtaClick = () => {
    if (overviewResponse?.opportunitiesTableId) {
      navigate(
        `/tables?path=/database/${DEFAULT_DATABASE_ID}/table/${overviewResponse.opportunitiesTableId}`,
      );
    }
  };

  return (
    <div className="flex-col w-full overflow-x-auto">
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-col gap-8 px-7">
          <div>
            <h2 className="text-xl font-bold mb-2">{t('Overview')}</h2>
            <DasbhoardOverview
              onOpportunitiesCtaClick={
                overviewResponse?.opportunitiesTableId
                  ? onOpportunitiesCtaClick
                  : undefined
              }
              openOpportunitiesCount={formatNumber(
                overviewResponse?.openOpportunities,
              )}
              unaddressedSavingsAmount={formatCurrency(
                overviewResponse?.unaddressedSavings,
              )}
              unnadressedSavingsPlaceholderText={getUnnaddressedSavingsPlaceholderText()}
              realizedSavingsAmount={formatCurrency(
                overviewResponse?.realizedSavings,
              )}
              realizedSavingsPlaceholderText={
                flowsExist ? '' : t('Run your workflow to start saving money.')
              }
              isLoading={isOverviewLoading}
            />
          </div>

          <HomeFlowsTable
            data={flowsResponse?.data || []}
            flowsExist={flowsExist}
            loading={isLoadingFlows}
            refetch={refetchFlows}
          />

          <HomeRunsTable
            data={runsResponse?.data || []}
            loading={runsLoading}
          />
        </div>
      </div>
    </div>
  );
};

export const HomeDemoPageHeader = () => {
  const { isLoadingFlows, existingFlowsResponse } = useDashboardData();
  const flowsExist = !!existingFlowsResponse?.data?.length;
  const showAddFlowButton = !flowsExist && !isLoadingFlows;

  return (
    <PageHeader title={t('Welcome to OpenOps')} className="pr-7">
      {showAddFlowButton && <CreateNewFlowInFolder />}
    </PageHeader>
  );
};

HomeDemoPage.displayName = 'HomeDemoPage';
export { HomeDemoPage };
