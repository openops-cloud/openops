import { t } from 'i18next';
import { Plus } from 'lucide-react';
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
      variant="basic"
      className="bg-accent enabled:hover:bg-input dark:bg-accent/10 rounded-xs mx-2"
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
  );
};
