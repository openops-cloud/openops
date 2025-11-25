import { useAppStore } from '@/app/store/app-store';
import { Button, cn, TooltipWrapper } from '@openops/components/ui';
import { t } from 'i18next';
import { Bot } from 'lucide-react';
import { useCallback } from 'react';

const AiAssistantButton = ({ className }: { className?: string }) => {
  const { isAiChatOpened, setIsAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const onToggleAiChat = useCallback(() => {
    setIsAiChatOpened(!isAiChatOpened);
  }, [isAiChatOpened, setIsAiChatOpened]);

  return (
    <TooltipWrapper
      tooltipText={t('OpenOps Assistant')}
      tooltipPlacement="right"
    >
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
