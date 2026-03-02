import React from 'react';

type PermissionNeededTooltipProps = {
  children: React.ReactNode;
  message?: string;
  className?: string;
  tooltipPlacement?: 'bottom' | 'left';
};

export const PermissionNeededTooltip = ({
  children,
}: PermissionNeededTooltipProps) => {
  return children;
};

PermissionNeededTooltip.displayName = 'PermissionNeededTooltip';
