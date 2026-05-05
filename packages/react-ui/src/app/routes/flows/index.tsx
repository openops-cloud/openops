import {
  Button,
  DataTable,
  DataTableBulkAction,
  FOLDER_ID_PARAM_NAME,
  PaginationParams,
  toast,
  WarningWithIcon,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { CornerUpLeft, Download, Trash2 } from 'lucide-react';
import qs from 'qs';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ConfirmationDeleteDialog } from '@/app/common/components/delete-dialog';
import { useCheckAccessAndRedirect } from '@/app/common/hooks/authorization-hooks';
import { useDefaultSidebarState } from '@/app/common/hooks/use-default-sidebar-state';
import { isModifierOrMiddleClick } from '@/app/common/navigation/table-navigation-helper';
import {
  columnVisibility,
  createColumns,
} from '@/app/features/flows/flows-columns';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { flowsUtils } from '@/app/features/flows/lib/flows-utils';
import { FlowsFolderBreadcrumbsManager } from '@/app/features/folders/component/folder-breadcrumbs-manager';
import {
  MoveToFolderDialog,
  MoveToFolderFormSchema,
} from '@/app/features/folders/component/move-to-folder-dialog';
import { useRefetchFolderTree } from '@/app/features/folders/hooks/refetch-folder-tree';
import { FLOWS_TABLE_FILTERS } from '@/app/features/folders/lib/flows-table-filters';
import { isSortDirection } from '@/app/lib/sort-direction';
import {
  FlowSortBy,
  FlowStatus,
  FlowVersionState,
  Permission,
  PopulatedFlow,
} from '@openops/shared';

const isFlowSortBy = (sortBy?: string): sortBy is FlowSortBy => {
  return !!sortBy && Object.values(FlowSortBy).includes(sortBy as FlowSortBy);
};

const getFlowIds = (rows: PopulatedFlow[]): string[] => {
  return rows.map((flow) => flow.id);
};

const FlowsPage = () => {
  useDefaultSidebarState('expanded');
  const hasAccess = useCheckAccessAndRedirect(Permission.READ_FLOW);
  const navigate = useNavigate();
  const [tableRefresh, setTableRefresh] = useState(false);
  const [selectedRows, setSelectedRows] = useState<PopulatedFlow[]>([]);
  const refetchFolderTree = useRefetchFolderTree();
  const onTableRefresh = useCallback(
    () => setTableRefresh((prev) => !prev),
    [],
  );
  const { mutateAsync: deleteFlows, isPending: isDeleteFlowsPending } =
    useMutation({
      mutationFn: async (flowIds: string[]) => {
        await flowsApi.deleteMany({ flowIds });
      },
    });
  const { mutateAsync: exportFlows, isPending: isExportFlowsPending } =
    useMutation({
      mutationFn: async (flows: PopulatedFlow[]) => {
        await Promise.all(
          flows.map((flow) =>
            flowsUtils.downloadFlow(flow.id, flow.version.id),
          ),
        );
      },
      onSuccess: () => {
        toast({
          title: t('Success'),
          description: t('Workflows have been exported.'),
          duration: 3000,
        });
      },
    });

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
    [onTableRefresh],
  );

  const resetSelectedRows = useCallback(() => {
    setSelectedRows([]);
  }, []);

  const completeBulkAction = useCallback(
    (resetSelection: () => void) => {
      resetSelection();
      resetSelectedRows();
      onTableRefresh();
    },
    [onTableRefresh, resetSelectedRows],
  );

  const moveSelectedFlows = useCallback(
    async (folderId: string) => {
      await flowsApi.moveMany({
        flowIds: getFlowIds(selectedRows),
        folderId,
      });
    },
    [selectedRows],
  );

  const deleteSelectedFlows = useCallback(async () => {
    await deleteFlows(getFlowIds(selectedRows));
    await refetchFolderTree();
  }, [deleteFlows, refetchFolderTree, selectedRows]);

  const exportSelectedFlows = useCallback(async () => {
    await exportFlows(selectedRows);
  }, [exportFlows, selectedRows]);

  const bulkActions = useMemo<DataTableBulkAction<PopulatedFlow>[]>(
    () => [
      {
        render: (_selectedRows, resetSelection) => (
          <MoveToFolderDialog
            displayName={t('{count} selected workflows', {
              count: selectedRows.length,
            })}
            apiMutateFn={async (data: MoveToFolderFormSchema) => {
              await moveSelectedFlows(data.folder);
              return { success: true };
            }}
            onMoveTo={() => completeBulkAction(resetSelection)}
          >
            <Button variant="outline" size="sm" className="gap-2">
              <CornerUpLeft className="h-4 w-4" />
              {t('Move To')}
            </Button>
          </MoveToFolderDialog>
        ),
      },
      {
        render: (_selectedRows, _resetSelection) => (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            loading={isExportFlowsPending}
            onClick={exportSelectedFlows}
          >
            <Download className="h-4 w-4" />
            {isExportFlowsPending ? t('Exporting') : t('Export')}
          </Button>
        ),
      },
      {
        render: (_selectedRows, resetSelection) => (
          <ConfirmationDeleteDialog
            title={
              <span className="text-primary text-[22px]">
                {t('Delete workflows')}
              </span>
            }
            className="max-w-[700px]"
            message={
              <span className="max-w-[652px] block text-primary text-base font-medium">
                {t('Are you sure you want to delete {count} workflows?', {
                  count: selectedRows.length,
                })}
              </span>
            }
            mutationFn={async () => {
              await deleteSelectedFlows();
              completeBulkAction(resetSelection);
            }}
            entityName={t('workflows')}
            content={
              <WarningWithIcon
                message={t(
                  'Deleting workflows will permanently remove all data and stop any ongoing runs.',
                )}
              />
            }
          >
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              loading={isDeleteFlowsPending}
            >
              <Trash2 className="h-4 w-4" />
              {t('Delete')}
            </Button>
          </ConfirmationDeleteDialog>
        ),
      },
    ],
    [
      deleteFlows,
      isDeleteFlowsPending,
      isExportFlowsPending,
      onTableRefresh,
      exportSelectedFlows,
      completeBulkAction,
      deleteSelectedFlows,
      moveSelectedFlows,
      refetchFolderTree,
      selectedRows,
    ],
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
            enableSelection={true}
            onSelectedRowsChange={(rows) => setSelectedRows(rows)}
            bulkActions={bulkActions}
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
