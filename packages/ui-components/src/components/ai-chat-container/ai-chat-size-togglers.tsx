import { t } from 'i18next';
import { ExpandIcon, MinimizeIcon, Plus, X as XIcon } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '../../ui/button';
import { TooltipWrapper } from '../tooltip-wrapper';
import { AI_CHAT_CONTAINER_SIZES, AiChatContainerSizeState } from './types';

type AiChatSizeTogglersProps = {
  state: AiChatContainerSizeState;
  toggleContainerSizeState: (state: AiChatContainerSizeState) => void;
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
  const onClickHandler = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.stopPropagation();
      onNewChatClick();
    },
    [onNewChatClick],
  );
  return (
    <>
      <TooltipWrapper
        tooltipText={
          state === AI_CHAT_CONTAINER_SIZES.EXPANDED ? t('Dock') : t('Expand')
        }
      >
        <>
          <Button
            variant="basic"
            className="bg-gray-100 dark:bg-accent/10 bg-input rounded-xs mx-2"
            size="xs"
            onClick={onClickHandler}
            disabled={!enableNewChat}
            type="button"
          >
            <div className="flex items-center">
              <Plus size={13} />
              <span className="font-semibold text-xs ">{t('New chat')}</span>
            </div>
          </Button>
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
        </>
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
};

AiChatSizeTogglers.displayName = 'AiChatSizeTogglers';
export { AiChatSizeTogglers };
