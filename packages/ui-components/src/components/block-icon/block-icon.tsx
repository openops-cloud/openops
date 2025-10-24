import { ActionType, BlockCategory, TriggerType } from '@openops/shared';
import { VariantProps, cva } from 'class-variance-authority';
import React from 'react';
import { cn } from '../../lib/cn';
import { getIconComponent } from '../../lib/icon-mapping';
import { ImageWithFallback } from '../../ui/image-with-fallback';
import { Skeleton } from '../../ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

const blockIconVariants = cva('flex items-center justify-center   ', {
  variants: {
    circle: {
      true: 'rounded-full bg-accent/35 p-2',
      false: 'dark:rounded-[2px]',
    },
    size: {
      xxl: 'size-[64px] p-4',
      xl: 'size-[48px]',
      lg: 'size-[40px]',
      md: 'size-[36px]',
      sm: 'size-[25px]',
    },
    border: {
      true: 'border border-solid',
    },
  },
  defaultVariants: {},
});

interface BlockIconCircleProps extends VariantProps<typeof blockIconVariants> {
  displayName?: string;
  logoUrl?: string;
  displayIcon?: string;
  category?: string;
  className?: string;
  showTooltip: boolean;
}

export const getCategoryFromType = (
  type: ActionType | TriggerType | undefined,
): string | undefined => {
  if (!type) return undefined;

  switch (type) {
    case ActionType.CODE:
    case TriggerType.EMPTY:
      return BlockCategory.CORE;
    case ActionType.LOOP_ON_ITEMS:
    case ActionType.BRANCH:
    case ActionType.SPLIT:
      return BlockCategory.WORKFLOW;
    default:
      return undefined;
  }
};

const CATEGORY_COLORS = {
  [BlockCategory.FINOPS]: 'text-fuchsia-600',
  [BlockCategory.CLOUD]: 'text-green-500',
  [BlockCategory.WORKFLOW]: 'text-blue-500',
  [BlockCategory.COLLABORATION]: 'text-yellow-500',
  [BlockCategory.DATA_SOURCES]: 'text-indigo-600',
  [BlockCategory.DEVOPS]: 'text-fuchsia-600',
  [BlockCategory.CORE]: 'text-green-500',
} as const;

const BlockIcon = React.memo(
  ({
    displayName,
    logoUrl,
    displayIcon: iconName,
    category,
    border,
    size,
    circle = false,
    showTooltip,
    className,
  }: BlockIconCircleProps) => {
    const IconComponent = getIconComponent(iconName);
    const categoryColor = category
      ? CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
      : 'text-current';
    const shouldShowBorder = IconComponent || (logoUrl && border);
    const borderClasses = shouldShowBorder
      ? `border border-solid border-gray-200 ${
          circle ? 'rounded-full' : 'rounded-xs'
        }`
      : '';
    const getPaddingClasses = () => {
      if (IconComponent) {
        return circle ? 'p-[5px_5.5px]' : 'px-[5px] py-[5.5px]';
      } else if (circle) {
        return 'p-2';
      }
      return '';
    };

    const paddingClasses = getPaddingClasses();

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              blockIconVariants({ size, circle }),
              'dark:bg-accent-foreground/25',
              className,
              borderClasses,
              paddingClasses,
            )}
          >
            {IconComponent ? (
              <IconComponent
                size={
                  size === 'sm'
                    ? 14
                    : size === 'md'
                    ? 16
                    : size === 'lg'
                    ? 20
                    : size === 'xl'
                    ? 24
                    : 28
                }
                className={cn('object-contain', categoryColor)}
              />
            ) : logoUrl ? (
              <ImageWithFallback
                src={logoUrl}
                alt={displayName}
                className="object-contain"
                fallback={<Skeleton className="rounded-full w-full h-full" />}
              />
            ) : (
              <Skeleton className="rounded-full w-full h-full" />
            )}
          </div>
        </TooltipTrigger>
        {showTooltip ? (
          <TooltipContent side="bottom">{displayName}</TooltipContent>
        ) : null}
      </Tooltip>
    );
  },
);

BlockIcon.displayName = 'BlockIcon';
export { BlockIcon };
