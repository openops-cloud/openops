import { SquarePen } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '../ui/button';

export const NewAiChatButton = ({
  enableNewChat,
  onNewChatClick,
}: {
  enableNewChat: boolean;
  onNewChatClick: () => void;
}) => {
  const onClickHandler = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.stopPropagation();
      onNewChatClick();
    },
    [onNewChatClick],
  );
  return (
    <Button
      onClick={onClickHandler}
      disabled={!enableNewChat}
      variant="basic"
      size="icon"
      className="text-outline"
    >
      <SquarePen size={16} />
    </Button>
  );
};
