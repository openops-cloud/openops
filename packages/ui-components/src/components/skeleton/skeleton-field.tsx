import React from 'react';
import { cn } from '../../lib/cn';
import { useSkeletonField } from './skeleton-field-context';

type SkeletonFieldProps = {
  children: React.ReactNode;
  className?: string;
  show?: boolean;
};

const SkeletonField = ({
  children,
  className,
  show: showProp,
}: SkeletonFieldProps) => {
  const { showSkeleton: showContext } = useSkeletonField();
  const show = showProp ?? showContext;

  if (show) {
    return (
      <div
        data-testid="skeleton-field"
        className={cn(
          'w-full h-full rounded-xl',
          'animate-shimmer bg-gradient-to-l from-muted via-border to-muted bg-[length:200%_100%]',
          className,
        )}
      />
    );
  }

  return children;
};

SkeletonField.displayName = 'SkeletonField';

export { SkeletonField };
