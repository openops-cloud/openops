import { cva } from 'class-variance-authority';
import { t } from 'i18next';

import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { BlockIcon } from './block-icon';

type BlockIconListMetadata = {
  displayName: string;
  logoUrl?: string;
  displayIcon?: string;
  category?: string;
  categories?: string[];
};

type BlockIconListProps = {
  metadata: BlockIconListMetadata[];
  maxNumberOfIconsToShow: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
};

const extraIconVariants = cva(
  'flex items-center justify-center bg-accent/35 text-accent-foreground  p-2 rounded-full border border-solid dark:bg-accent-foreground/25 dark:text-foreground select-none',
  {
    variants: {
      size: {
        xxl: 'size-[64px]',
        xl: 'size-[48px]',
        lg: 'size-[40px]',
        md: 'size-[36px]',
        sm: 'size-[25px]',
      },
    },
    defaultVariants: {},
  },
);

export function BlockIconList({
  maxNumberOfIconsToShow,
  metadata = [],
  size,
}: BlockIconListProps) {
  const uniqueBlocks = useMemo(
    () =>
      metadata.filter(
        (item, index, self) =>
          self.findIndex((i) => i.displayName === item.displayName) === index,
      ),
    [metadata],
  );

  const visibleBlocks = useMemo(
    () => uniqueBlocks.slice(0, maxNumberOfIconsToShow),
    [uniqueBlocks, maxNumberOfIconsToShow],
  );

  const numberOfNotVisibleBlocks = useMemo(
    () => uniqueBlocks.length - visibleBlocks.length,
    [uniqueBlocks, visibleBlocks],
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex gap-2 max-w-full w-fit">
          {visibleBlocks.map((metadata, index) => (
            <BlockIcon
              logoUrl={metadata.logoUrl}
              displayIcon={metadata.displayIcon}
              showTooltip={false}
              circle={true}
              size={size ?? 'md'}
              border={true}
              displayName={metadata.displayName}
              category={metadata.category || metadata.categories?.[0]}
              key={index}
            />
          ))}
          {!!numberOfNotVisibleBlocks && (
            <div className={extraIconVariants({ size: size ?? 'md' })}>
              +{numberOfNotVisibleBlocks}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {uniqueBlocks.length > 1 &&
          uniqueBlocks
            .map((m) => m?.displayName || '')
            .slice(0, -1)
            .join(', ') +
            ` ${t('and')} ${uniqueBlocks[uniqueBlocks.length - 1].displayName}`}
        {uniqueBlocks.length === 1 && uniqueBlocks[0].displayName}
      </TooltipContent>
    </Tooltip>
  );
}
