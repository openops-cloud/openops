import {
  BlockIcon,
  cn,
  StepMetadata,
  StepTemplateMetadata,
} from '@openops/components/ui';
import React from 'react';

type BlockCardInfoProps = {
  stepMetadata: StepMetadata;
  stepTemplateMetadata: StepTemplateMetadata;
  interactive: boolean;
  onClick?: () => void;
};

const BlockCardInfo: React.FC<BlockCardInfoProps> = ({
  stepMetadata,
  stepTemplateMetadata,
  interactive,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center justify-center gap-3 rounded-sm border border-solid px-4 py-2',
      {
        'cursor-pointer hover:bg-accent hover:text-accent-foreground':
          interactive,
      },
    )}
  >
    <div className="flex h-full min-w-[24px] items-center justify-center">
      <BlockIcon
        logoUrl={stepMetadata.logoUrl}
        displayName={stepMetadata.displayName}
        showTooltip
        border={false}
        size={'sm'}
      ></BlockIcon>
    </div>

    <div className="flex h-full grow flex-col justify-center text-start">
      <div className="text-sm flex">{stepTemplateMetadata.displayName}</div>
      <div className="overflow-hidden text-ellipsis text-xs text-muted-foreground">
        {stepTemplateMetadata.description}
      </div>
    </div>
  </div>
);

export { BlockCardInfo };
