import {
  DataTable,
  FOLDER_ID_PARAM_NAME,
  PaginationParams,
} from '@openops/components/ui';
import qs from 'qs';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCheckAccessAndRedirect } from '@/app/common/hooks/authorization-hooks';
import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import { isModifierOrMiddleClick } from '@/app/common/navigation/table-navigation-helper';
import {
  columnVisibility,
  createColumns,
} from '@/app/features/flows/flows-columns';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { FlowsFolderBreadcrumbsManager } from '@/app/features/folders/component/folder-breadcrumbs-manager';
import { FLOWS_TABLE_FILTERS } from '@/app/features/folders/lib/flows-table-filters';
import { isSortDirection } from '@/app/lib/sort-direction';
import {
  FlowSortBy,
  FlowStatus,
  FlowVersionState,
  Permission,
} from '@openops/shared';

const isFlowSortBy = (sortBy?: string): sortBy is FlowSortBy => {
  return !!sortBy && Object.values(FlowSortBy).includes(sortBy as FlowSortBy);
};

const FlowsPage = () => {
  useDefaultSidebarState('expanded');
  const hasAccess = useCheckAccessAndRedirect(Permission.READ_FLOW);
  const navigate = useNavigate();
  const [tableRefresh, setTableRefresh] = useState(false);
  const onTableRefresh = useCallback(
    () => setTableRefresh((prev) => !prev),
    [],
  );

  const [searchParams] = useSearchParams();

  const fetchData = useCallback(
    async (
      params: {
        name: string;
        status: FlowStatus[];
        versionState: FlowVersionState[];
      },
      pagination: PaginationParams,
    ) => {
      return flowsApi.list({
        cursor: pagination.cursor,
        limit: pagination.limit ?? 10,
        sortBy: isFlowSortBy(pagination.sortBy) ? pagination.sortBy : undefined,
        sortDirection: isSortDirection(pagination.sortDirection)
          ? pagination.sortDirection
          : undefined,
        status: params.status,
        versionState: params.versionState,
        name: params.name,
        folderId: searchParams.get(FOLDER_ID_PARAM_NAME) ?? undefined,
      });
    },
    [searchParams],
  );

  const columns = useMemo(
    () =>
      createColumns(onTableRefresh).filter(
        (column) => column.accessorKey !== 'folderId',
      ),
    [],
  );

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      <div className="px-7">
        <FlowsFolderBreadcrumbsManager />
      </div>
      <div className="flex flex-row gap-4 px-7">
        <div className="w-full">
          <DataTable
            columns={columns}
            fetchData={fetchData}
            filters={FLOWS_TABLE_FILTERS}
            enableSorting={true}
            columnVisibility={columnVisibility}
            navigationExcludedColumns={['status', 'actions']}
            refresh={tableRefresh}
            getRowHref={(row) =>
              `/flows/${row.id}?${qs.stringify({
                folderId: searchParams.get(FOLDER_ID_PARAM_NAME),
                viewOnly: true,
              })}`
            }
            onRowClick={(row, e) => {
              const route = `/flows/${row.id}?${qs.stringify({
                folderId: searchParams.get(FOLDER_ID_PARAM_NAME),
                viewOnly: true,
              })}`;
              if (isModifierOrMiddleClick(e)) {
                return;
              } else {
                navigate(route);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export { FlowsPage };
