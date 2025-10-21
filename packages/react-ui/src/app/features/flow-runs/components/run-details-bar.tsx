import { Button, cn, OverflowTooltip } from '@openops/components/ui';
import { QuestionMarkIcon } from '@radix-ui/react-icons';
import { t } from 'i18next';
import React, { useMemo } from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { getStatusText } from '@/app/features/builder/run-details/run-details-helpers';
import { FlagId, FlowRun } from '@openops/shared';

import { flowRunUtils } from '../lib/flow-run-utils';

type RunDetailsBarProps = {
  run: FlowRun | null;
  canExitRun: boolean;
  exitRun: () => void;
  isLoading: boolean;
};

const NO_TIMEOUT_SECONDS = -1;

const RunDetailsBar = React.memo(
  ({ run, canExitRun, exitRun, isLoading }: RunDetailsBarProps) => {
    const { Icon, variant } = run
      ? flowRunUtils.getStatusIcon(run.status)
      : { Icon: QuestionMarkIcon, variant: 'default' };

    const { data: timeoutSeconds } = flagsHooks.useFlag<number>(
      FlagId.FLOW_RUN_TIME_SECONDS,
    );

    const statusText = useMemo(() => {
      if (!run) return '';
      return getStatusText(
        run.status,
        timeoutSeconds ?? NO_TIMEOUT_SECONDS,
        run.terminationReason,
      );
    }, [run, timeoutSeconds]);

    if (!run) {
      return <></>;
    }

    return (
      <div className="h-[42px] flex items-center justify-start gap-2 px-2 py-1 bg-background shadow-lg border rounded-lg contain-layout">
        <Icon
          className={cn('w-6 h-6', {
            'text-foreground': variant === 'default',
            'text-success': variant === 'success',
            'text-destructive': variant === 'error',
          })}
        />
        <div className="text-sm text-nowrap flex max-w-[180px]">
          <OverflowTooltip text={statusText} tooltipPlacement={'bottom'} />
        </div>
        <div className="text-xs text-muted-foreground hidden @[950px]:block">
          {run?.id ?? t('Unknown')}
        </div>

        {canExitRun && (
          <Button
            variant={'outline'}
            onClick={() => exitRun()}
            loading={isLoading}
            onKeyboardShortcut={() => exitRun()}
            keyboardShortcut="Esc"
            className="h-8"
          >
            {t('Exit')}
          </Button>
        )}
      </div>
    );
  },
);

RunDetailsBar.displayName = 'RunDetailsBar';
export { RunDetailsBar };
