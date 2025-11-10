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
        'w-full h-full flex flex-col bg-gray-100 rounded-sm shadow-ai-history-popover overflow-hidden gap-1',
        className,
      )}
    >
      <div className="pl-2 pr-[13px] pt-[10px] flex-shrink-0">
        <button
          type="button"
          onClick={onNewChat}
          disabled={newChatDisabled}
          className={cn(
            'flex items-center gap-2 h-[38px] px-[9px] w-full rounded-[8px] text-sm font-normal text-black cursor-pointer',
            'hover:bg-gray-200/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'transition-colors',
          )}
        >
          <Plus size={16} className="text-black" />
          <span className="text-sm">New chat</span>
        </button>
      </div>
      <ScrollArea className="flex-1 min-h-0 pl-2 pr-[13px] pb-2">
        <div className="flex flex-col gap-1">
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
