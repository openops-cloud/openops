import { Button, cn } from '@openops/components/ui';
import { QuestionMarkIcon } from '@radix-ui/react-icons';
import { t } from 'i18next';
import React from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { getStatusText } from '@/app/features/builder/run-details/run-details-helpers';
import { FlagId, FlowRun } from '@openops/shared';

import { flowRunUtils } from '../lib/flow-run-utils';

type RunDetailsBarProps = {
  run?: FlowRun;
  canExitRun: boolean;
  exitRun: () => void;
  isLoading: boolean;
};

const RunDetailsBar = React.memo(
  ({ run, canExitRun, exitRun, isLoading }: RunDetailsBarProps) => {
    const { Icon, variant } = run
      ? flowRunUtils.getStatusIcon(run.status)
      : { Icon: QuestionMarkIcon, variant: 'default' };

    const { data: timeoutSeconds } = flagsHooks.useFlag<number>(
      FlagId.FLOW_RUN_TIME_SECONDS,
    );

    if (!run) {
      return <></>;
    }

    return (
      <div
        className="fixed bottom-4 p-4 left-1/2 transform -translate-x-1/2 w-[400px] bg-background shadow-lg border h-16 flex items-center justify-start
       rounded-lg z-[9999]"
      >
        <Icon
          className={cn('w-6 h-6 mr-3', {
            'text-foreground': variant === 'default',
            'text-success': variant === 'success',
            'text-destructive': variant === 'error',
          })}
        />
        <div className="flex-col flex flex-grow text-foreground gap-0">
          <div className="text-sm">
            {getStatusText(run.status, timeoutSeconds ?? -1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {run?.id ?? t('Unknown')}
          </div>
        </div>
        {canExitRun && (
          <Button
            variant={'outline'}
            onClick={() => exitRun()}
            loading={isLoading}
            onKeyboardShortcut={() => exitRun()}
            keyboardShortcut="Esc"
          >
            {t('Exit Run')}
          </Button>
        )}
      </div>
    );
  },
);

RunDetailsBar.displayName = 'RunDetailsBar';
export { RunDetailsBar };
