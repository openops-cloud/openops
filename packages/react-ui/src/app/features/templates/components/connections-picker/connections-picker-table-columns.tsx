import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  BlockIcon,
  Button,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  RowDataWithActions,
} from '@openops/components/ui';
import { AppConnectionWithoutSensitiveData } from '@openops/shared';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { Plus, RefreshCcw } from 'lucide-react';

type TemplateConnectionTableData = {
  selectedConnection: AppConnectionWithoutSensitiveData | null;
  connectionOptions: AppConnectionWithoutSensitiveData[];
  integration: BlockMetadataModelSummary;
  id: string;
};

const connectionsPickerTableColumns: ColumnDef<
  RowDataWithActions<TemplateConnectionTableData>
>[] = [
  {
    accessorKey: 'logoUrl',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('App')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-4">
          <BlockIcon
            logoUrl={row.original.integration.logoUrl}
            displayName={row.original.integration.displayName}
            showTooltip={false}
            size={'lg'}
            circle={true}
            border={true}
          ></BlockIcon>
          {row.original.integration.displayName}
        </div>
      );
    },
  },

  {
    accessorKey: 'selectedConnectionName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Connection Name')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-left">
          {row.original.selectedConnection?.name ?? '--'}
        </div>
      );
    },
  },
];

type ConnectionPickerTableActions = {
  addConnection: (block: BlockMetadataModelSummary) => void;
  onConnectionChange: (connection: AppConnectionWithoutSensitiveData) => void;
} & TemplateConnectionTableData;

const ConnectionPickerTableActions = ({
  integration,
  connectionOptions,
  selectedConnection,
  addConnection,
  onConnectionChange,
}: ConnectionPickerTableActions) => {
  if (selectedConnection) {
    return (
      <DropdownMenu modal={true}>
        <DropdownMenuTrigger
          className="rounded-full p-2 cursor-pointer"
          role="menuitem"
          data-testid="flow-details-panel-actions"
          asChild
        >
          <Button variant="ghost" className="gap-1 text-primary-200 font-bold">
            <RefreshCcw width={16} height={16} />
            {t('Change')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onSelect={() => addConnection(integration)}
            className="flex items-center gap-1"
          >
            <Plus size={16} />
            {t('Create Connection')}
          </DropdownMenuItem>
          {connectionOptions?.map((connection) => {
            return (
              <DropdownMenuItem
                key={connection.id}
                onSelect={() => onConnectionChange(connection)}
              >
                {connection.name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="ghost"
      className="gap-1 text-primary-200 font-bold"
      onClick={() => addConnection(integration)}
    >
      <Plus width={16} height={16} />
      {t('Add')}
    </Button>
  );
};

ConnectionPickerTableActions.displayName = 'ConnectionPickerTableActions';
export {
  ConnectionPickerTableActions,
  connectionsPickerTableColumns,
  TemplateConnectionTableData,
};
