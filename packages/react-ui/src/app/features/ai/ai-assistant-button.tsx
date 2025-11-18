import { useAssistantName } from '@/app/features/ai/lib/use-assistant-name';
import { useAppStore } from '@/app/store/app-store';
import { Button, cn, TooltipWrapper } from '@openops/components/ui';
import { Bot } from 'lucide-react';
import { useCallback } from 'react';

const AiAssistantButton = ({ className }: { className?: string }) => {
  const { isAiChatOpened, setIsAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const assistantName = useAssistantName();

  const onToggleAiChat = useCallback(() => {
    setIsAiChatOpened(!isAiChatOpened);
  }, [isAiChatOpened, setIsAiChatOpened]);

  return (
    <TooltipWrapper tooltipText={assistantName} tooltipPlacement="right">
      <Button
        variant="ai"
        className={cn('size-9 p-0 gap-2', className, {
          'from-ring/55 to-primary-200/55': isAiChatOpened,
        })}
        onClick={onToggleAiChat}
      >
        <Bot className="w-6 h-6 dark:text-primary" />
      </Button>
    </TooltipWrapper>
  );
};

AiAssistantButton.displayName = 'AiAssistantButton';
export { AiAssistantButton };
