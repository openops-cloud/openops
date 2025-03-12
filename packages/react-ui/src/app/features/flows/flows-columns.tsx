import {
  BlockIconList,
  DataTableColumnHeader,
  RowDataWithActions,
} from '@openops/components/ui';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { CircleAlert, EllipsisVertical } from 'lucide-react';

import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { FlowActionMenu } from '@/app/features/flows/components/flow-actions-menu';
import { FlowStatusToggle } from '@/app/features/flows/components/flow-status-toggle';
import { FolderBadge } from '@/app/features/folders/component/folder-badge';
import { formatUtils } from '@/app/lib/utils';
import { flowHelper, PopulatedFlow } from '@openops/shared';

export const createColumns = (
  onTableRefresh: () => void,
): (ColumnDef<RowDataWithActions<PopulatedFlow>> & {
  accessorKey: string;
})[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Name')} />
    ),
    cell: ({ row }) => {
      const status = row.original.version.displayName;
      return <div className="text-left max-w-[300px]">{status}</div>;
    },
  },
  {
    accessorKey: 'integrations',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Integrations')} />
    ),
    cell: ({ row }) => {
      const steps = flowHelper.getAllSteps(row.original.version.trigger);
      const stepsMetadata = blocksHooks.useIntegrationStepLogos(steps);

      return (
        <BlockIconList metadata={stepsMetadata} maxNumberOfIconsToShow={2} />
      );
    },
  },
  {
    accessorKey: 'folderId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Folder')} />
    ),
    cell: ({ row }) => {
      const folderId = row.original.folderId;
      return (
        <div className="text-left min-w-[150px]">
          {folderId ? (
            <FolderBadge folderId={folderId} />
          ) : (
            <span>{t('Uncategorized')}</span>
          )}
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
      const created = row.original.created;
      return (
        <div className="text-left font-medium min-w-[150px]">
          {formatUtils.formatDate(new Date(created))}
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
      const { updated } = row.original.version;
      return (
        <div className="text-left font-medium min-w-[150px]">
          {formatUtils.formatDate(new Date(updated))}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Status')} />
    ),
    cell: ({ row }) => {
      return (
        <div
          className="flex items-center space-x-2"
          onClick={(e) => e.stopPropagation()}
        >
          <FlowStatusToggle
            flow={row.original}
            flowVersion={row.original.version}
          ></FlowStatusToggle>
        </div>
      );
    },
  },
  {
    accessorKey: 'valid',
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      const valid = row.original.version.valid;
      if (valid) {
        return null;
      }
      return (
        <div className="w-fit px-3 py-1 flex items-center gap-1 rounded-full border border-warning bg-warning-100">
          <CircleAlert size={16} className="text-warning" />
          <span className="font-medium text-sm text-blueAccent-200 dark:text-primary text-nowrap">
            {t('Not finished')}
          </span>
        </div>
      );
    },
  },
  {
    // versionState filter requires column with 'versionState' accessorKey to work properly
    accessorKey: 'versionState',
  },
  {
    accessorKey: 'actions',
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      const flow = row.original;
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <FlowActionMenu
            insideBuilder={false}
            flow={flow}
            readonly={false}
            flowVersion={flow.version}
            onRename={onTableRefresh}
            onMoveTo={onTableRefresh}
            onDuplicate={onTableRefresh}
            onDelete={onTableRefresh}
          >
            <EllipsisVertical className="h-10 w-10" />
          </FlowActionMenu>
        </div>
      );
    },
  },
];

export const columnVisibility = {
  versionState: false,
};
