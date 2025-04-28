import { ExpandIcon, PanelRightDashedIcon, X as XIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { AI_CHAT_CONTAINER_SIZES, AiChatContainerSizeState } from './types';

type AiChatSizeTogglersProps = {
  size: AiChatContainerSizeState;
  toggleContainerSizeState: (state: AiChatContainerSizeState) => void;
  onCloseClick: () => void;
};

const AiChatSizeTogglers = ({
  size,
  toggleContainerSizeState,
  onCloseClick,
}: AiChatSizeTogglersProps) => {
  const buttonClassName = (btnState: AiChatContainerSizeState) =>
    cn('', {
      'text-outline': size === btnState,
      'text-outline opacity-50 hover:opacity-100': size !== btnState,
    });

  return (
    <>
      <Button
        size="icon"
        onClick={() =>
          toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.EXPANDED)
        }
        className={buttonClassName(AI_CHAT_CONTAINER_SIZES.EXPANDED)}
        variant="basic"
      >
        <ExpandIcon />
      </Button>
      <Button
        size="icon"
        onClick={() => toggleContainerSizeState(AI_CHAT_CONTAINER_SIZES.DOCKED)}
        className={buttonClassName(AI_CHAT_CONTAINER_SIZES.DOCKED)}
        variant="basic"
      >
        <PanelRightDashedIcon></PanelRightDashedIcon>
      </Button>
      <Button
        size="icon"
        variant="basic"
        onClick={onCloseClick}
        className="text-outline opacity-50 hover:opacity-100"
      >
        <XIcon />
      </Button>
    </>
  );
};

AiChatSizeTogglers.displayName = 'AiChatSizeTogglers';
export { AiChatSizeTogglers };
