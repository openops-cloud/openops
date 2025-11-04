import { Plus } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { ScrollArea } from '../../../ui/scroll-area';
import { AssistantUiHistoryItem } from './assistant-ui-history-item';

type AssistantUiHistoryProps = {
  onNewChat: () => void;
  newChatDisabled: boolean;
  onChatSelected: (chatId: string) => void;
  onChatDeleted: (chatId: string) => void;
  onChatRenamed?: (chatId: string, newName: string) => void;
  chatItems: { id: string; displayName: string }[];
  selectedItemId?: string;
  className?: string;
};

const AssistantUiHistory = ({
  onNewChat,
  newChatDisabled,
  onChatDeleted,
  onChatSelected,
  onChatRenamed,
  chatItems,
  selectedItemId,
  className,
}: AssistantUiHistoryProps) => {
  return (
    <div
      className={cn(
        'w-full h-full flex flex-col bg-gray-100 rounded-[8px] shadow-[0px_0px_7px_0px_rgba(187,193,218,0.5)] overflow-hidden',
        className,
      )}
    >
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <button
          type="button"
          onClick={onNewChat}
          disabled={newChatDisabled}
          className={cn(
            'flex items-center gap-2 text-sm font-normal text-black cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-opacity',
          )}
        >
          <Plus size={16} className="text-black" />
          <span className="text-[14px] leading-[20px]">New chat</span>
        </button>
      </div>
      <ScrollArea className="flex-1 min-h-0 pl-[8px] pr-[13px] pb-2">
        <div className="flex flex-col gap-[8px]">
          {chatItems.map((chatItem) => (
            <AssistantUiHistoryItem
              key={chatItem.id}
              displayName={chatItem.displayName}
              onClick={() => onChatSelected(chatItem.id)}
              onDelete={() => onChatDeleted(chatItem.id)}
              onRename={
                onChatRenamed
                  ? (newName) => onChatRenamed(chatItem.id, newName)
                  : undefined
              }
              isActive={chatItem.id === selectedItemId}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

AssistantUiHistory.displayName = 'AssistantUiHistory';
export { AssistantUiHistory };
