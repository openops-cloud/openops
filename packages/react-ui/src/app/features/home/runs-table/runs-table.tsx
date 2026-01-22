import { DataTable, RunsIcon } from '@openops/components/ui';
import { FlowRun } from '@openops/shared';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';

import { useRunsTableColumns } from '@/app/features/flow-runs/hooks/useRunsTableColumns';

import { isModifierOrMiddleClick } from '@/app/common/navigation/table-navigation-helper';
import { HomeTableWrapper } from '../components/home-table-wrapper';

type Props = {
  data: FlowRun[];
  loading: boolean;
  refetch: () => void;
};

const HomeRunsTable = ({ data, loading, refetch }: Props) => {
  const navigate = useNavigate();
  const runsColumns = useRunsTableColumns({ refetch });

  return (
    <HomeTableWrapper
      heading={t('Last runs')}
      seeAllLink="/runs"
      seeAllText={t('See all')}
      hasData={data.length > 0}
    >
      <DataTable
        data={data}
        columns={runsColumns}
        loading={loading}
        stickyHeader
        border={false}
        navigationExcludedColumns={['actions']}
        emptyStateComponent={<EmptyTableState />}
        getRowHref={(row) => `/runs/${row.id}`}
        onRowClick={(row, e) => {
          if (isModifierOrMiddleClick(e)) {
            return;
          } else {
            navigate(`/runs/${row.id}`);
          }
        }}
      />
    </HomeTableWrapper>
  );
};

const EmptyTableState = () => (
  <div className="flex flex-col items-center justify-center gap-1 my-12">
    <RunsIcon className="mb-4 size-8" />
    <p className="font-bold text-base">{t('No runs yet')}</p>
    <p className="max-w-64 text-base">
      {t('Create and publish workflows to see them in action.')}
    </p>
  </div>
);

HomeRunsTable.displayName = 'HomeRuns';
export { HomeRunsTable };
