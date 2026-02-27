import React from 'react';

type PermissionNeededTooltipProps = {
  children: React.ReactNode;
  message?: string;
  className?: string;
};

export const PermissionNeededTooltip = ({
  children,
}: PermissionNeededTooltipProps) => {
  return children;
};

PermissionNeededTooltip.displayName = 'PermissionNeededTooltip';
