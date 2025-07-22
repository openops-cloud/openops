import { useTheme } from '@/app/common/providers/theme-provider';
import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { useAppStore } from '@/app/store/app-store';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import {
  AI_CHAT_CONTAINER_SIZES,
  AiAssistantChatContainer,
  AiAssistantChatSizeState,
  CHAT_MIN_WIDTH,
  cn,
  NoAiEnabledPopover,
  PARENT_INITIAL_HEIGHT_GAP,
  PARENT_MAX_HEIGHT_GAP,
  Thread,
  ThreadWelcomeProvider,
} from '@openops/components/ui';
import { t } from 'i18next';
import { useCallback, useMemo } from 'react';
import { useAssistantChat } from './assistant-ui/assistant-ui-chat';

type AiAssistantChatProps = {
  middlePanelSize: {
    width: number;
    height: number;
  };
  className?: string;
};

const CHAT_MAX_WIDTH = 600;
const CHAT_EXPANDED_WIDTH_OFFSET = 32;
const CHAT_WIDTH_FACTOR = 0.3;

const AiAssistantChat = ({
  middlePanelSize,
  className,
}: AiAssistantChatProps) => {
  const { theme } = useTheme();
  const {
    isAiChatOpened,
    setIsAiChatOpened,
    aiChatSize,
    setAiChatSize,
    aiChatDimensions,
    setAiChatDimensions,
  } = useAppStore((s) => ({
    isAiChatOpened: s.isAiChatOpened,
    setIsAiChatOpened: s.setIsAiChatOpened,
    aiChatSize: s.aiChatSize,
    setAiChatSize: s.setAiChatSize,
    aiChatDimensions: s.aiChatDimensions,
    setAiChatDimensions: s.setAiChatDimensions,
  }));

  const { runtime, messages, handleSubmit, createNewChat } = useAssistantChat();

  const sizes = useMemo(() => {
    const calculatedWidth = middlePanelSize.width * CHAT_WIDTH_FACTOR;
    const calculatedExpandedWidth =
      middlePanelSize.width - CHAT_EXPANDED_WIDTH_OFFSET;

    const calculatedHeight =
      middlePanelSize.height -
      (aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
        ? PARENT_MAX_HEIGHT_GAP
        : PARENT_INITIAL_HEIGHT_GAP);

    return {
      current: aiChatDimensions ?? {
        width: Math.max(
          CHAT_MIN_WIDTH,
          aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED
            ? calculatedExpandedWidth
            : Math.min(calculatedWidth, CHAT_MAX_WIDTH),
        ),
        height: calculatedHeight,
      },
      max: {
        width: middlePanelSize.width - CHAT_EXPANDED_WIDTH_OFFSET,
        height: middlePanelSize.height - PARENT_MAX_HEIGHT_GAP,
      },
    };
  }, [
    aiChatDimensions,
    aiChatSize,
    middlePanelSize.height,
    middlePanelSize.width,
  ]);

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const onToggleAiChatState = useCallback(() => {
    let newSize: AiAssistantChatSizeState;
    if (aiChatSize === AI_CHAT_CONTAINER_SIZES.EXPANDED) {
      newSize = AI_CHAT_CONTAINER_SIZES.DOCKED;
    } else {
      newSize = AI_CHAT_CONTAINER_SIZES.EXPANDED;
    }
    setAiChatSize(newSize);
  }, [aiChatSize, setAiChatSize]);

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
    <AssistantRuntimeProvider runtime={runtime}>
      <AiAssistantChatContainer
        dimensions={sizes.current}
        setDimensions={setAiChatDimensions}
        maxSize={sizes.max}
        showAiChat={isAiChatOpened}
        onCloseClick={() => setIsAiChatOpened(false)}
        className={cn('left-4 bottom-[17px]', className)}
        handleSubmit={handleSubmit}
        isEmpty={!messages?.length}
        onCreateNewChatClick={createNewChat}
        toggleAiChatState={onToggleAiChatState}
        aiChatSize={aiChatSize}
      >
        <ThreadWelcomeProvider greeting={t('How can I help you today?')}>
          <Thread theme={theme} />
        </ThreadWelcomeProvider>
      </AiAssistantChatContainer>
    </AssistantRuntimeProvider>
  );
};

AiAssistantChat.displayName = 'AiAssistantChat';
export { AiAssistantChat };
