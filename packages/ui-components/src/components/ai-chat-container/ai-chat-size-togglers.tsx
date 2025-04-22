import { PanelRightDashedIcon, X as XIcon } from 'lucide-react';
import { Button } from '../../ui/button';
import { AiChatContainerSizeState } from './types';

type AiChatSizeTogglersProps = {
  state: AiChatContainerSizeState;
  toggleContainerSizeState: () => void;
  onCloseClick: () => void;
};

const AiChatSizeTogglers = ({
  state,
  toggleContainerSizeState,
  onCloseClick,
}: AiChatSizeTogglersProps) => {
  return (
    <>
      <Button size="icon" onClick={toggleContainerSizeState} variant="basic">
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
