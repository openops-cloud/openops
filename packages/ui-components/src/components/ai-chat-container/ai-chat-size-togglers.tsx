import { PanelRightDashedIcon, X as XIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { AiChatContainerSizeState } from './types';

type AiChatSizeTogglersProps = {
  state: AiChatContainerSizeState;
  setContainerSizeState: (state: AiChatContainerSizeState) => void;
  onCloseClick: () => void;
};

const AiChatSizeTogglers = ({
  state,
  setContainerSizeState,
  onCloseClick,
}: AiChatSizeTogglersProps) => {
  const handleClick = (newState: AiChatContainerSizeState) => {
    setContainerSizeState(newState);
  };

  const buttonClassName = (btnState: AiChatContainerSizeState) =>
    cn('', {
      'text-outline': state === btnState,
      'text-outline opacity-50': state !== btnState,
    });

  return (
    <>
      <Button
        size="icon"
        className={buttonClassName('docked')}
        onClick={() => handleClick('docked')}
        variant="basic"
      >
        <PanelRightDashedIcon></PanelRightDashedIcon>
      </Button>
      <Button size="icon" variant="basic" onClick={onCloseClick}>
        <XIcon />
      </Button>
    </>
  );
};

AiChatSizeTogglers.displayName = 'AiChatSizeTogglers';
export { AiChatSizeTogglers };
