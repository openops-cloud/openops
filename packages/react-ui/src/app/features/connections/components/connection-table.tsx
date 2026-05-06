import { PermissionGuard } from '@/app/common/components/permission-guard';
import { appConnectionsApi } from '@/app/features/connections/lib/app-connections-api';
import { handleMutationError } from '@/app/interceptors/interceptor-utils';
import { isSortDirection } from '@/app/lib/sort-direction';
import { formatUtils } from '@/app/lib/utils';
import {
  BlockIcon,
  DataTable,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PaginationParams,
  RowDataWithActions,
  StatusIconWithText,
} from '@openops/components/ui';
import {
  AppConnection,
  AppConnectionSortBy,
  AppConnectionStatus,
  MinimalFlow,
  Permission,
} from '@openops/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { CheckIcon, EllipsisVertical } from 'lucide-react';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';

import { appConnectionUtils } from '../lib/app-connections-utils';

import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { useMutation } from '@tanstack/react-query';
import { appConnectionsHooks } from '../lib/app-connections-hooks';
import { useConnectionsContext } from './connections-context';
import { DeleteConnectionDialog } from './delete-connection-dialog';
import { EditConnectionDialog } from './edit-connection-dialog';

const isAppConnectionSortBy = (
  sortBy?: string,
): sortBy is AppConnectionSortBy => {
  return (
    !!sortBy &&
    Object.values(AppConnectionSortBy).includes(sortBy as AppConnectionSortBy)
  );
};

type BlockIconWithBlockNameProps = {
  authProviderKey: string;
};
const BlockIconWithBlockName = ({
  authProviderKey,
}: BlockIconWithBlockNameProps) => {
  const { data: connectionsMetadata } =
    appConnectionsHooks.useConnectionsMetadata();
  const connectionModel = connectionsMetadata?.[authProviderKey];

  const displayName = connectionModel?.authProviderDisplayName;
  const logoUrl = connectionModel?.authProviderLogoUrl;

  return (
    <BlockIcon
      circle={true}
      size={'md'}
      border={true}
      displayName={displayName}
      logoUrl={logoUrl}
      showTooltip={true}
    />
  );
};

const MenuConnectionColumn = ({
  row,
  setRefresh,
}: {
  row: RowDataWithActions<AppConnection>;
  setRefresh: Dispatch<SetStateAction<boolean>>;
}) => {
  const [linkedFlows, setLinkedFlows] = useState<MinimalFlow[]>([]);
  const { mutate, isPending } = useMutation<
    MinimalFlow[],
    Error,
    { connectionName: string }
  >({
    mutationFn: async ({ connectionName }) => {
      return await flowsApi.getLatestFlowVersionsByConnection({
        connectionName,
      });
    },
    onSuccess: (data) => {
      setLinkedFlows(data);
    },
    onError: handleMutationError,
  });

  const [isEditConnectionDialog, setIsEditConnectionDialog] = useState(false);

  const deleteConnectionMutation = useCallback(
    () =>
      appConnectionsApi.delete(row.id).then((data) => {
        setRefresh((prev) => !prev);
        return data;
      }),
    [row.id, setRefresh],
  );

  return (
    <div className="flex items-end justify-end">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          asChild
          className="rounded-full p-2 hover:bg-muted cursor-pointer"
        >
          <EllipsisVertical className="h-10 w-10" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[155px]">
          <PermissionGuard
            permission={Permission.WRITE_APP_CONNECTION}
            tooltipClassName="flex"
          >
            <DropdownMenuItem
              key="edit"
              onSelect={(e) => {
                e.preventDefault();
                setIsEditConnectionDialog(true);
              }}
            >
              <span className="text-black text-sm font-medium cursor-pointer w-full">
                {t('Edit')}
              </span>
            </DropdownMenuItem>
          </PermissionGuard>
          <PermissionGuard
            permission={Permission.DELETE_APP_CONNECTION}
            tooltipClassName="flex"
          >
            <DropdownMenuItem
              key="delete"
              onSelect={(e) => {
                e.preventDefault();
              }}
            >
              <DeleteConnectionDialog
                connectionName={row.name}
                mutationFn={deleteConnectionMutation}
                isPending={isPending}
                linkedFlows={linkedFlows}
              >
                <button
                  onClick={() => mutate({ connectionName: row.name })}
                  className="text-black text-sm font-medium bg-transparent border-none p-0 m-0 cursor-pointer appearance-none w-full text-left"
                  type="button"
                >
                  {t('Delete')}
                </button>
              </DeleteConnectionDialog>
            </DropdownMenuItem>
          </PermissionGuard>
        </DropdownMenuContent>
      </DropdownMenu>
      {isEditConnectionDialog && (
        <EditConnectionDialog id={row.id} setOpen={setIsEditConnectionDialog} />
      )}
    </div>
  );
};
const columns: (
  setRefresh: Dispatch<SetStateAction<boolean>>,
) => ColumnDef<RowDataWithActions<AppConnection>>[] = (setRefresh) => {
  return [
    {
      accessorKey: 'authProviderKey',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('App')} />
      ),
      cell: ({ row }) => {
        return (
          <div className="text-left">
            <BlockIconWithBlockName
              authProviderKey={row.original.authProviderKey}
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Name')} />
      ),
      cell: ({ row }) => {
        return <div className="text-left">{row.original.name}</div>;
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Status')} />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const { variant, icon: Icon } =
          appConnectionUtils.getStatusIcon(status);
        return (
          <div className="text-left">
            <StatusIconWithText
              icon={Icon}
              text={formatUtils.convertEnumToHumanReadable(status)}
              variant={variant}
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'created',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Created')} />
      ),
      cell: ({ row }) => {
        return (
          <div className="text-left">
            {formatUtils.formatDate(new Date(row.original.created))}
          </div>
        );
      },
    },
    {
      accessorKey: 'updated',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('Updated')} />
      ),
      cell: ({ row }) => {
        return (
          <div className="text-left">
            {formatUtils.formatDate(new Date(row.original.updated))}
          </div>
        );
      },
    },
    {
      accessorKey: 'actions',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="" />
      ),
      cell: ({ row }) => {
        return (
          <MenuConnectionColumn row={row.original} setRefresh={setRefresh} />
        );
      },
    },
  ];
};

const filters = [
  {
    type: 'select',
    title: t('Status'),
    accessorKey: 'status',
    options: Object.values(AppConnectionStatus).map((status) => {
      return {
        label: formatUtils.convertEnumToHumanReadable(status),
        value: status,
      };
    }),
    icon: CheckIcon,
  } as const,
];
const fetchData = async (
  params: { status: AppConnectionStatus[] },
  pagination: PaginationParams,
) => {
  return appConnectionsApi.list({
    cursor: pagination.cursor,
    limit: pagination.limit ?? 10,
    status: params.status,
    sortBy: isAppConnectionSortBy(pagination.sortBy)
      ? pagination.sortBy
      : undefined,
    sortDirection: isSortDirection(pagination.sortDirection)
      ? pagination.sortDirection
      : undefined,
  });
};

function AppConnectionsTable() {
  const { refresh, setRefresh } = useConnectionsContext();

  return (
    <div className="flex-col w-full">
      <div className="px-7">
        <DataTable
          columns={columns(setRefresh)}
          fetchData={fetchData}
          refresh={refresh}
          filters={filters}
          enableSorting={true}
        />
      </div>
    </div>
  );
}

export { AppConnectionsTable };
