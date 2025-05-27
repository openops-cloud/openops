import {
  BlockIcon,
  Button,
  DataTable,
  DataTableColumnHeader,
  RowDataWithActions,
} from '@openops/components/ui';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { Trash } from 'lucide-react';
import { useState } from 'react';

import { ConfirmationDeleteDialog } from '@/app/common/components/delete-dialog';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { InstallBlockDialog } from '@/app/features/blocks/components/install-block-dialog';
import { blocksApi } from '@/app/features/blocks/lib/blocks-api';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import { BlockScope, BlockType, FlagId, isNil } from '@openops/shared';

const columns: ColumnDef<RowDataWithActions<BlockMetadataModelSummary>>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('App')} />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-left">
          <BlockIcon
            circle={true}
            size={'md'}
            border={true}
            displayName={row.original.displayName}
            logoUrl={row.original.logoUrl}
            showTooltip={false}
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'displayName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Display Name')} />
    ),
    cell: ({ row }) => {
      return <div className="text-left">{row.original.displayName}</div>;
    },
  },
  {
    accessorKey: 'packageName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Package Name')} />
    ),
    cell: ({ row }) => {
      return <div className="text-left">{row.original.name}</div>;
    },
  },
  {
    accessorKey: 'version',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t('Version')} />
    ),
    cell: ({ row }) => {
      return <div className="text-left">{row.original.version}</div>;
    },
  },
  {
    accessorKey: 'actions',
    header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
    cell: ({ row }) => {
      if (
        row.original.blockType === BlockType.CUSTOM &&
        !isNil(row.original.projectId)
      ) {
        return (
          <ConfirmationDeleteDialog
            title={t('Delete {name}', { name: row.original.name })}
            entityName={t('Block')}
            message={t(
              'This will permanently delete this block, all steps using it will fail.',
            )}
            mutationFn={async () => {
              row.original.delete();
              await blocksApi.delete(row.original.id!);
            }}
          >
            <div className="flex items-end justify-end">
              <Button variant="ghost" className="size-8 p-0">
                <Trash className="size-4 text-destructive" />
              </Button>
            </div>
          </ConfirmationDeleteDialog>
        );
      }
      return null;
    },
  },
];

const fetchData = async () => {
  const blocks = await blocksApi.list({
    includeHidden: true,
  });
  return {
    data: blocks,
    next: null,
    previous: null,
  };
};

const ProjectBlocksPage = () => {
  const [refresh, setRefresh] = useState(0);

  const { data: installBlocksEnabled } = flagsHooks.useFlag<boolean>(
    FlagId.INSTALL_PROJECT_BLOCKS_ENABLED,
  );

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div className="mx-auto w-full flex-col">
        <div className="mb-4 flex">
          <h1 className="text-3xl font-bold">{t('Blocks')}</h1>
          <div className="ml-auto">
            {installBlocksEnabled && (
              <InstallBlockDialog
                onInstallBlock={() => setRefresh(refresh + 1)}
                scope={BlockScope.PROJECT}
              />
            )}
          </div>
        </div>
        <DataTable columns={columns} refresh={refresh} fetchData={fetchData} />
      </div>
    </div>
  );
};

ProjectBlocksPage.displayName = 'ProjectBlocksPage';
export { ProjectBlocksPage };
