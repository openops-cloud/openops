import { t } from 'i18next';
import { ExpandIcon, MinimizeIcon, SquarePen, X as XIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { TooltipWrapper } from '../tooltip-wrapper';
import { AI_CHAT_CONTAINER_SIZES, AiCliChatContainerSizeState } from './types';

type AiChatSizeTogglersProps = {
  state: AiCliChatContainerSizeState;
  toggleContainerSizeState: (state: AiCliChatContainerSizeState) => void;
  onCloseClick: () => void;
  enableNewChat: boolean;
  onNewChatClick: () => void;
};

const AiChatSizeTogglers = ({
  state,
  toggleContainerSizeState,
  onCloseClick,
  enableNewChat,
  onNewChatClick,
}: AiChatSizeTogglersProps) => {
  return (
    <>
      <TooltipWrapper tooltipText={t('New chat')}>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onNewChatClick();
          }}
          disabled={!enableNewChat}
          variant="basic"
          size="icon"
          className="text-outline"
        >
          <SquarePen size={16} />
        </Button>
      </TooltipWrapper>
      <TooltipWrapper
        tooltipText={
          state === AI_CHAT_CONTAINER_SIZES.EXPANDED ? t('Dock') : t('Expand')
        }
      >
        <Button
          size="icon"
          className="text-outline"
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
            <MinimizeIcon size={16} />
          ) : (
            <ExpandIcon size={16} />
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
          className="text-outline"
        >
          <XIcon size={20} />
        </Button>
      </TooltipWrapper>
    </>
  );
};

AiChatSizeTogglers.displayName = 'AiChatSizeTogglers';
export { AiChatSizeTogglers };
