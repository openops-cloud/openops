import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import { appConnectionsApi } from '@/app/features/connections/lib/app-connections-api';
import { formatUtils } from '@/app/lib/utils';
import {
  BlockIcon,
  Button,
  DataTable,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  INTERNAL_ERROR_TOAST,
  PageHeader,
  PaginationParams,
  PermissionNeededTooltip,
  RowDataWithActions,
  StatusIconWithText,
  toast,
} from '@openops/components/ui';
import {
  AppConnection,
  AppConnectionStatus,
  MinimalFlow,
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
import { NewConnectionTypeDialog } from './new-connection-type-dialog';

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
    onError: () => toast(INTERNAL_ERROR_TOAST),
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
  });
};

const ConnectionsHeader = () => {
  const { checkAccess } = useAuthorization();
  const userHasPermissionToWriteAppConnection = checkAccess();

  const { setRefresh } = useConnectionsContext();

  return (
    <PageHeader title={t('Connections')}>
      <div className="ml-auto mr-7">
        <PermissionNeededTooltip
          hasPermission={userHasPermissionToWriteAppConnection}
        >
          <NewConnectionTypeDialog
            onConnectionCreated={() => setRefresh((prev) => !prev)}
          >
            <Button
              variant="default"
              disabled={!userHasPermissionToWriteAppConnection}
            >
              {t('New Connection')}
            </Button>
          </NewConnectionTypeDialog>
        </PermissionNeededTooltip>
      </div>
    </PageHeader>
  );
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
        />
      </div>
    </div>
  );
}

export { AppConnectionsTable, ConnectionsHeader };
