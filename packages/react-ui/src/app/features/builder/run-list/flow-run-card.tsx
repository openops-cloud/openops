import {
  Button,
  CardListItem,
  cn,
  INTERNAL_ERROR_TOAST,
  LoadingSpinner,
  toast,
} from '@openops/components/ui';
import { StopwatchIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { ChevronRightIcon } from 'lucide-react';
import React from 'react';

import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { flowRunUtils } from '@/app/features/flow-runs/lib/flow-run-utils';
import { flowRunsApi } from '@/app/features/flow-runs/lib/flow-runs-api';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { formatUtils } from '@/app/lib/utils';
import { FlowRun, isNil, PopulatedFlow } from '@openops/shared';
import { LeftSideBarType } from '../builder-types';

type FlowRunCardProps = {
  run: FlowRun;
};

const FlowRunCard = React.memo((params: FlowRunCardProps) => {
  const { run } = params;
  const { Icon, variant } = flowRunUtils.getStatusIcon(run.status);
  const [setLeftSidebar, setRun] = useBuilderStateContext((state) => [
    state.setLeftSidebar,
    state.setRun,
  ]);
  const { mutate, isPending } = useMutation<
    {
      run: FlowRun;
      populatedFlow: PopulatedFlow;
    },
    Error,
    string
  >({
    mutationFn: async (flowRunId) => {
      const run = await flowRunsApi.getPopulated(flowRunId);
      const populatedFlow = await flowsApi.get(run.flowId, {
        versionId: run.flowVersionId,
      });
      return {
        run,
        populatedFlow,
      };
    },
    onSuccess: ({ run, populatedFlow }) => {
      setRun(run, populatedFlow.version);
      setLeftSidebar(LeftSideBarType.RUN_DETAILS);
    },
    onError: (error) => {
      toast(INTERNAL_ERROR_TOAST);
      console.error(error);
    },
  });

  return (
    <CardListItem
      onClick={() => {
        if (isPending) {
          return;
        }
        mutate(run.id);
      }}
      key={run.id}
    >
      <div>
        <span>
          <Icon
            className={cn('w-5 h-5', {
              'text-success': variant === 'success',
              'text-destructive': variant === 'error',
            })}
          />
        </span>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium leading-none">
          {formatUtils.formatDate(new Date(run.startTime))}
        </p>
        {run.finishTime && (
          <p className="flex gap-1 text-xs text-muted-foreground">
            <StopwatchIcon />
            {t('Took')} {formatUtils.formatDuration(run.duration, false)}
          </p>
        )}
        {isNil(run.finishTime) ||
          (!run.finishTime && (
            <p className="flex gap-1 text-xs text-muted-foreground">
              {t('Running')}...
            </p>
          ))}
      </div>
      <div className="ml-auto font-medium">
        <Button variant="ghost" disabled={isPending}>
          {isPending && <LoadingSpinner className="w-5 h-5" />}
          {!isPending && <ChevronRightIcon className="w-5 h-5" />}
        </Button>
      </div>
    </CardListItem>
  );
});

FlowRunCard.displayName = 'FlowRunCard';
export { FlowRunCard };
