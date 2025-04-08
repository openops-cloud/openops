import {
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  INTERNAL_ERROR_TOAST,
  PermissionNeededTooltip,
  RowDataWithActions,
  StatusIconWithText,
  toast,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { EllipsisVertical, RefreshCw, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { flowRunsApi } from '@/app/features/flow-runs/lib/flow-runs-api';
import { formatUtils } from '@/app/lib/utils';
import {
  FlagId,
  FlowRetryStrategy,
  FlowRun,
  isFailedState,
  Permission,
} from '@openops/shared';

import { flowRunUtils } from '../lib/flow-run-utils';

type Column = ColumnDef<RowDataWithActions<FlowRun>> & {
  accessorKey: string;
};

export const useRunsTableColumns = (): Column[] => {
  const { checkAccess } = useAuthorization();
  const durationEnabled = flagsHooks.useFlag<boolean>(
    FlagId.SHOW_DURATION,
  ).data;

  const userHasPermissionToRetryRun = checkAccess(Permission.RETRY_RUN);
  const { mutate } = useMutation<
    FlowRun,
    Error,
    { row: RowDataWithActions<FlowRun>; strategy: FlowRetryStrategy }
  >({
    mutationFn: (data) =>
      flowRunsApi.retry(data.row.id, { strategy: data.strategy }),
    onSuccess: (updatedRun, { row }) => {
      row.update(updatedRun);
    },
    onError: (error) => {
      console.error(error);
      toast(INTERNAL_ERROR_TOAST);
    },
  });
  return useMemo(
    () =>
      [
        {
          accessorKey: 'flowId',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Workflow')} />
          ),
          cell: ({ row }) => {
            return (
              <div className="text-left">{row.original.flowDisplayName}</div>
            );
          },
        },
        {
          accessorKey: 'status',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Status')} />
          ),
          cell: ({ row }) => {
            const status = row.original.status;
            const { variant, Icon } = flowRunUtils.getStatusIcon(status);
            const explanation = flowRunUtils.getStatusExplanation(status);
            return (
              <div className="text-left">
                <StatusIconWithText
                  icon={Icon}
                  text={formatUtils.convertEnumToHumanReadable(status)}
                  variant={variant}
                  explanation={explanation}
                />
              </div>
            );
          },
        },
        {
          accessorKey: 'created',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Start Time')} />
          ),
          cell: ({ row }) => {
            return (
              <div className="text-left">
                {formatUtils.formatDate(new Date(row.original.startTime))}
              </div>
            );
          },
        },
        {
          accessorKey: 'duration',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Duration')} />
          ),
          cell: ({ row }) => {
            return (
              <div className="text-left">
                {row.original.finishTime &&
                  formatUtils.formatDuration(row.original.duration)}
              </div>
            );
          },
        },
        {
          accessorKey: 'actions',
          header: () => null,
          cell: ({ row }) => {
            return (
              <div
                className="flex items-end justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    asChild
                    className="rounded-full p-2 hover:bg-muted cursor-pointer"
                  >
                    <EllipsisVertical className="h-10 w-10" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <PermissionNeededTooltip
                      hasPermission={userHasPermissionToRetryRun}
                    >
                      <DropdownMenuItem
                        disabled={!userHasPermissionToRetryRun}
                        onClick={() =>
                          mutate({
                            row: row.original,
                            strategy: FlowRetryStrategy.ON_LATEST_VERSION,
                          })
                        }
                      >
                        <div className="flex flex-row gap-2 items-center">
                          <RefreshCw className="h-4 w-4" />
                          <span>{t('Retry on latest version')}</span>
                        </div>
                      </DropdownMenuItem>
                    </PermissionNeededTooltip>

                    {isFailedState(row.original.status) && (
                      <PermissionNeededTooltip
                        hasPermission={userHasPermissionToRetryRun}
                      >
                        <DropdownMenuItem
                          disabled={!userHasPermissionToRetryRun}
                          onClick={() =>
                            mutate({
                              row: row.original,
                              strategy: FlowRetryStrategy.FROM_FAILED_STEP,
                            })
                          }
                        >
                          <div className="flex flex-row gap-2 items-center">
                            <RotateCcw className="h-4 w-4" />
                            <span>{t('Retry from failed step')}</span>
                          </div>
                        </DropdownMenuItem>
                      </PermissionNeededTooltip>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        },
      ].filter(
        (column) => durationEnabled || column.accessorKey !== 'duration',
      ),
    [mutate, userHasPermissionToRetryRun],
  );
};
