import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { flowRunsApi } from '@/app/features/flow-runs/lib/flow-runs-api';
import { formatUtils } from '@/app/lib/utils';
import {
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  INTERNAL_ERROR_TOAST,
  RowDataWithActions,
  StatusIconWithText,
  toast,
} from '@openops/components/ui';
import {
  FlagId,
  FlowRetryStrategy,
  FlowRun,
  FlowRunStatus,
  FlowRunTriggerSource,
  isFailedState,
  isRunningState,
} from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { t } from 'i18next';
import { CircleStop, EllipsisVertical, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { RunType } from '@/app/features/flow-runs/components/run-type';
import { StopRunDialog } from '@/app/features/flow-runs/components/stop-run-dialog';
import { flowRunUtils } from '../lib/flow-run-utils';

type Column = ColumnDef<RowDataWithActions<FlowRun>> & {
  accessorKey: string;
};

export const useRunsTableColumns = (): Column[] => {
  const durationEnabled = flagsHooks.useFlag<boolean>(
    FlagId.SHOW_DURATION,
  ).data;

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

  const { mutate: stopRun } = useMutation<
    void,
    Error,
    { row: RowDataWithActions<FlowRun> }
  >({
    mutationFn: (data) => flowRunsApi.abort(data.row.id),
    onSuccess: (_, { row }) => {
      row.update({ ...row, status: FlowRunStatus.STOPPED });
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
          accessorKey: 'triggerSource',
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t('Type')} />
          ),
          cell: ({ row }: { row: { original: FlowRun } }) => {
            const status = row.original.triggerSource;

            return <RunType type={status}></RunType>;
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
            const isFailed = isFailedState(row.original.status);
            const isRunning = isRunningState(row.original.status);
            const isStopped = row.original.status === FlowRunStatus.STOPPED;

            // eslint-disable-next-line react-hooks/rules-of-hooks
            const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);

            if (
              ((isFailed || isStopped) &&
                row.original.triggerSource === FlowRunTriggerSource.TEST_RUN) ||
              (!isFailed && !isRunning && !isStopped)
            ) {
              return <div className="h-10"></div>;
            }

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
                    {(isFailed || isStopped) && (
                      <DropdownMenuItem
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
                    )}
                    {isRunning && (
                      <StopRunDialog
                        isStopDialogOpen={isStopDialogOpen}
                        setIsStopDialogOpen={setIsStopDialogOpen}
                        stopRun={() => {
                          stopRun({ row: row.original });
                          setIsStopDialogOpen(false);
                        }}
                      >
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <div className="flex flex-row gap-2 items-center">
                            <CircleStop className="h-4 w-4" />
                            <span>{t('Stop Run')}</span>
                          </div>
                        </DropdownMenuItem>
                      </StopRunDialog>
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
    [mutate, stopRun],
  );
};
