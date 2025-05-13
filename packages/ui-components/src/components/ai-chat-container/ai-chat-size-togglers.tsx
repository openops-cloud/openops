import { t } from 'i18next';
import { ExpandIcon, MinimizeIcon, X as XIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { TooltipWrapper } from '../tooltip-wrapper';
import { AI_CHAT_CONTAINER_SIZES, AiChatContainerSizeState } from './types';

type AiChatSizeTogglersProps = {
  state: AiChatContainerSizeState;
  toggleContainerSizeState: (state: AiChatContainerSizeState) => void;
  onCloseClick: () => void;
};

const AiChatSizeTogglers = ({
  state,
  toggleContainerSizeState,
  onCloseClick,
}: AiChatSizeTogglersProps) => (
  <>
    <TooltipWrapper
      tooltipText={
        state === AI_CHAT_CONTAINER_SIZES.EXPANDED ? t('Dock') : t('Expand')
      }
    >
      <Button
        size="icon"
        className="text-outline opacity-50 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();

          if (state === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
            toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.DOCKED);
          } else {
            toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.EXPANDED);
          }
        }}
        variant="basic"
      >
        {state === AI_CHAT_CONTAINER_SIZES.EXPANDED ? (
          <MinimizeIcon />
        ) : (
          <ExpandIcon />
        )}
      </Button>
    </TooltipWrapper>

    <TooltipWrapper tooltipText={t('Close')}>
      <Button
        size="icon"
        variant="basic"
        onClick={(e) => {
          e.stopPropagation();
          onCloseClick();
        }}
        className="text-outline opacity-50 hover:opacity-100"
      >
        <XIcon />
      </Button>
    </TooltipWrapper>
  </>
);

AiChatSizeTogglers.displayName = 'AiChatSizeTogglers';
export { AiChatSizeTogglers };
