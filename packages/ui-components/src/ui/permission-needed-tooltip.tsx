import { t } from 'i18next';
import React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export const PermissionNeededTooltip = React.forwardRef<
  HTMLButtonElement,
  { children: React.ReactNode; hasPermission: boolean }
>(({ children, hasPermission }, ref) => {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger ref={ref} asChild disabled={!hasPermission}>
        <div>{children}</div>
      </TooltipTrigger>
      {!hasPermission && (
        <TooltipContent side="bottom">{t('Permission needed')}</TooltipContent>
      )}
    </Tooltip>
  );
});

PermissionNeededTooltip.displayName = 'PermissionNeededWrapper';
