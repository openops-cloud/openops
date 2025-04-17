import { PanelRightDashedIcon, X as XIcon } from 'lucide-react';
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

  return (
    <>
      <Button size="icon" onClick={() => handleClick('docked')} variant="basic">
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
