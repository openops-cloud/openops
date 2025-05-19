import { AiAssistantConversation } from '@/app/features/ai/ai-assistant-conversation';
import { useAiAssistantChat } from '@/app/features/ai/lib/ai-assistant-chat-hook';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import {
  AiAssistantChatContainer,
  cn,
  NoAiEnabledPopover,
} from '@openops/components/ui';
import { useMemo } from 'react';

type AiAssistantChatProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  className?: string;
};

const PARENT_HEIGHT_GAP = 220;
const CHAT_MIN_WIDTH = 360;
const CHAT_MAX_WIDTH = 600;

const AiAssistantChat = ({
  middlePanelSize,
  className,
}: AiAssistantChatProps) => {
  const { isAiChatOpened, setIsAiChatOpened } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    createNewChat,
    isOpenAiChatPending,
  } = useAiAssistantChat();

  const { width, height } = useMemo(() => {
    const calculatedWidth = middlePanelSize.width * 0.6;
    return {
      width: Math.max(
        CHAT_MIN_WIDTH,
        Math.min(calculatedWidth, CHAT_MAX_WIDTH),
      ),
      height: middlePanelSize.height - PARENT_HEIGHT_GAP,
    };
  }, [middlePanelSize]);

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  if (isLoading) {
    return null;
  }

  if (!hasActiveAiSettings && isAiChatOpened) {
    return (
      <NoAiEnabledPopover
        className={cn('absolute left-4 bottom-[17px] z-50', className)}
        onCloseClick={() => setIsAiChatOpened(false)}
      />
    );
  }

  return (
    <AiAssistantChatContainer
      height={height}
      width={width}
      showAiChat={isAiChatOpened}
      onCloseClick={() => setIsAiChatOpened(false)}
      className={cn('left-4 bottom-[17px]', className)}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      input={input}
      isEmpty={!messages?.length}
      onCreateNewChatClick={createNewChat}
    >
      <AiAssistantConversation
        messages={messages}
        status={status}
        isPending={isOpenAiChatPending}
      />
    </AiAssistantChatContainer>
  );
};

AiAssistantChat.displayName = 'AiAssistantChat';
export { AiAssistantChat };
