import {
  DataTable,
  FOLDER_ID_PARAM_NAME,
  FolderBreadcrumbs,
  PaginationParams,
} from '@openops/components/ui';
import { t } from 'i18next';
import { CheckIcon } from 'lucide-react';
import qs from 'qs';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import {
  columnVisibility,
  createColumns,
} from '@/app/features/flows/flows-columns';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import {
  ALL_SELECTED,
  foldersHooks,
} from '@/app/features/folders/lib/folders-hooks';
import { formatUtils } from '@/app/lib/utils';
import { FlowStatus, FlowVersionState } from '@openops/shared';

const filters = [
  {
    type: 'input',
    title: t('Workflow name'),
    accessorKey: 'name',
    options: [],
    icon: CheckIcon,
  } as const,
  {
    type: 'select',
    title: t('Status'),
    accessorKey: 'status',
    options: Object.values(FlowStatus).map((status) => {
      return {
        label: formatUtils.convertEnumToHumanReadable(status),
        value: status,
      };
    }),
    icon: CheckIcon,
  } as const,
  {
    type: 'select',
    title: t('Version'),
    accessorKey: 'versionState',
    options: Object.values(FlowVersionState)
      .sort()
      .map((version) => {
        return {
          label: version === FlowVersionState.DRAFT ? t('Draft') : t('Locked'),
          value: version,
        };
      }),
    icon: CheckIcon,
  } as const,
];

const useSelectedFolderId = () => {
  const [searchParams] = useSearchParams();

  return searchParams.get(FOLDER_ID_PARAM_NAME) || ALL_SELECTED;
};

const FolderBreadcrumbsManager = () => {
  const selectedFolderId = useSelectedFolderId();

  const { folderItems } = foldersHooks.useFolderItems();

  return (
    <FolderBreadcrumbs
      selectedFolderId={selectedFolderId}
      folderItems={folderItems}
    />
  );
};

const FlowsPage = () => {
  useDefaultSidebarState('expanded');
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

  return (
    <div className="flex flex-col w-full">
      <div className="px-7">
        <FolderBreadcrumbsManager />
      </div>
      <div className="flex flex-row gap-4 px-7">
        <div className="w-full">
          <DataTable
            columns={columns}
            fetchData={fetchData}
            filters={filters}
            columnVisibility={columnVisibility}
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
              if (e.ctrlKey || e.metaKey || e.button === 1) {
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
