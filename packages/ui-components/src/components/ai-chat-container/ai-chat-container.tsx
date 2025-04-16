import { t } from 'i18next';
import { useRef, useState } from 'react';
import { ScrollArea } from '../../ui/scroll-area';

import { cn } from '@/lib/cn';
import { Button } from '@/ui/button';

export enum AiChatContainerSizeState {
  EXPANDED,
  COLLAPSED,
  DOCKED,
}

type AiChatContainerProps = {
  parentHeight: number;
  parentWidth: number;
};

const AiChatContainer = ({
  parentHeight,
  parentWidth,
}: AiChatContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aiChatContainerSize, setAiChatContainerSize] =
    useState<AiChatContainerSizeState>(AiChatContainerSizeState.DOCKED);
  const [showDataSelector, setShowDataSelector] = useState(false);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'absolute bottom-[0px]  mr-5 mb-5  right-[0px]  z-50 transition-all  border border-solid border-outline overflow-x-hidden bg-background shadow-lg rounded-md',
        {
          'opacity-0 pointer-events-none': !showDataSelector,
        },
      )}
    >
      <div className="text-lg items-center font-semibold px-5 py-2 flex gap-2">
        {t('AI Copilot')} <div className="flex-grow"></div> <Button>X</Button>
      </div>
      <div
        style={{
          height:
            aiChatContainerSize === AiChatContainerSizeState.COLLAPSED
              ? '0px'
              : aiChatContainerSize === AiChatContainerSizeState.DOCKED
              ? '450px'
              : `${parentHeight - 100}px`,
          width:
            aiChatContainerSize !== AiChatContainerSizeState.EXPANDED
              ? '450px'
              : `${parentWidth - 40}px`,
        }}
        className="transition-all overflow-hidden"
      >
        <ScrollArea className="transition-all h-[calc(100%-56px)] w-full ">
          <span>WWWW</span>
        </ScrollArea>
      </div>
    </div>
  );
};

AiChatContainer.displayName = 'AiChatContainer';
export { AiChatContainer };
