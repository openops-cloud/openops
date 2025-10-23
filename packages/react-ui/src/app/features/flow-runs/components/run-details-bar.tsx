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
      <div className="w-[212px] min-w-[212px] h-[70px] flex flex-col items-center gap-1 pt-1 pb-2 bg-background shadow-lg border rounded-lg contain-layout z-[55]">
        <div className="h-8 w-full flex items-center pl-3 pr-2">
          <div className="w-6 h-6 flex items-center justify-center">
            <Icon
              className={cn('w-[14px] h-[14px]', {
                'text-foreground': variant === 'default',
                'text-success': variant === 'success',
                'text-destructive': variant === 'error',
              })}
            />
          </div>
          <OverflowTooltip
            text={statusText}
            tooltipPlacement={'bottom'}
            className="text-[13px] flex-1 min-w-0 "
          />

          {canExitRun && (
            <Button
              variant={'outline'}
              onClick={() => exitRun()}
              loading={isLoading}
              onKeyboardShortcut={() => exitRun()}
              keyboardShortcut="Esc"
              className="h-8 w-[86px] ml-[5px]"
            >
              {t('Exit')}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {run?.id ?? t('Unknown')}
        </div>
      </div>
    );
  },
);

RunDetailsBar.displayName = 'RunDetailsBar';
export { RunDetailsBar };
