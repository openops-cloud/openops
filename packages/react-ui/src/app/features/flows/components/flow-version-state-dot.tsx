import {
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openops/components/ui';
import { t } from 'i18next';
import React from 'react';

import { FlowVersionState } from '@openops/shared';

type FlowVersionStateProps = {
  state: FlowVersionState;
  className?: string;
};

const FlowVersionStateDot = React.memo(
  ({ state, className }: FlowVersionStateProps) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn('flex justify-center items-center pr-1', className)}
          >
            {state === FlowVersionState.DRAFT && (
              <span className="bg-warning size-1.5 rounded-full"></span>
            )}
            {state === FlowVersionState.LOCKED && (
              <span className="bg-success size-1.5 rounded-full"></span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {state === FlowVersionState.DRAFT
            ? t('Draft Version')
            : t('Locked Version')}
        </TooltipContent>
      </Tooltip>
    );
  },
);

FlowVersionStateDot.displayName = 'FlowVersionStateDot';
export { FlowVersionStateDot };
