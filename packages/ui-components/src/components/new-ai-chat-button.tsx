import { SquarePen } from 'lucide-react';
import { useCallback } from 'react';

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
    <button
      onClick={onClickHandler}
      disabled={!enableNewChat}
      type="button"
      className="
        flex justify-center items-center gap-0
        w-[22px] h-[22.889px] p-[2px_4px] flex-shrink-0
        rounded-[4px] bg-[#F3F4F6]
        border-none
        cursor-pointer disabled:cursor-not-allowed
        transition-colors
        hover:bg-gray-300
      "
      aria-label="New chat"
    >
      <SquarePen
        width={13}
        height={13}
        className="flex-shrink-0 aspect-square"
        color="#000"
      />
    </button>
  );
};
