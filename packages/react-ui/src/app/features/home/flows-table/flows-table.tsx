import { DataTable, NoWorkflowsPlaceholder } from '@openops/components/ui';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';

import {
  columnVisibility,
  createColumns,
} from '@/app/features/flows/flows-columns';
import { flowsHooks } from '@/app/features/flows/lib/flows-hooks';
import { PopulatedFlow } from '@openops/shared';

import { isModifierOrMiddleClick } from '@/app/common/navigation/table-navigation-helper';
import { useMemo } from 'react';
import { HomeTableWrapper } from '../components/home-table-wrapper';

type Props = {
  data: PopulatedFlow[];
  refetch: () => void;
  loading: boolean;
  flowsExist: boolean;
  onExploreTemplatesClick: () => void;
};

const HomeFlowsTable = ({
  data,
  loading,
  flowsExist,
  refetch,
  onExploreTemplatesClick,
}: Props) => {
  const navigate = useNavigate();
  const { mutate: createFlow } = flowsHooks.useCreateFlow(navigate);

  const columns = useMemo(
    () =>
      createColumns(refetch).filter(
        (column) => column.accessorKey !== 'updated',
      ),
    [],
  );

  return (
    <HomeTableWrapper
      heading={t('Recently created')}
      seeAllLink="/flows"
      seeAllText={t('See all')}
      hasData={data.length > 0}
    >
      {flowsExist ? (
        <DataTable
          data={data}
          columns={columns}
          columnVisibility={columnVisibility}
          loading={loading}
          stickyHeader
          border={false}
          getRowHref={(row) => `/flows/${row.id}`}
          onRowClick={(row, e) => {
            if (isModifierOrMiddleClick(e)) {
              return;
            } else {
              navigate(`/flows/${row.id}`);
            }
          }}
        />
      ) : (
        <NoWorkflowsPlaceholder
          onExploreTemplatesClick={onExploreTemplatesClick}
          onNewWorkflowClick={() => createFlow(undefined)}
        />
      )}
    </HomeTableWrapper>
  );
};

HomeFlowsTable.displayName = 'HomeFlowsTable';
export { HomeFlowsTable };
