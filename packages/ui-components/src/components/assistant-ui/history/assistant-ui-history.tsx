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
        'flex-1 w-full flex flex-col gap-2 bg-secondary py-3 overflow-hidden',
        className,
      )}
    >
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 px-2">
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
