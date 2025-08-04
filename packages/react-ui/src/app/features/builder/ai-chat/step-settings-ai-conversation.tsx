import { useTheme } from '@/app/common/providers/theme-provider';
import { UseChatHelpers } from '@ai-sdk/react';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  ChatStatus,
  LoadingSpinner,
  MarkdownCodeVariations,
} from '@openops/components/ui';
import { SourceCode } from '@openops/shared';
import { useCallback, useMemo } from 'react';
import { useBuilderStateContext } from '../builder-hooks';
import {
  MessageType,
  createCodeMessage,
  createMessage,
  extractCodeFromContent,
  isCodeMessage,
} from './conversation-utils';

type ConversationProps = {
  isPending: boolean;
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
  lastAssistantMessageRef: React.RefObject<HTMLDivElement>;
} & Pick<UseChatHelpers, 'messages' | 'status'>;

const StepSettingsAiConversation = ({
  messages,
  status,
  isPending,
  lastUserMessageRef,
  lastAssistantMessageRef,
}: ConversationProps) => {
  const { theme } = useTheme();
  const dispatch = useBuilderStateContext((state) => state.applyMidpanelAction);

  const onInject = useCallback(
    (code: string | SourceCode) => {
      dispatch({ type: 'ADD_CODE_TO_INJECT', code });
    },
    [dispatch],
  );

  const uiMessages: AIChatMessage[] = useMemo(() => {
    return messages.map((message: MessageType, idx) => {
      if (
        message.role.toLowerCase() === AIChatMessageRole.assistant &&
        isCodeMessage(message)
      ) {
        const codeFromContent = extractCodeFromContent(message);
        if (codeFromContent) {
          return createCodeMessage(message, idx, codeFromContent);
        }
      }
      return createMessage(message, idx);
    });
  }, [messages]);

  if (isPending) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-2 max-w-full">
      <AIChatMessages
        messages={uiMessages}
        onInject={onInject}
        codeVariation={MarkdownCodeVariations.WithCopyAndInject}
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
        theme={theme}
      />
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(
        status as ChatStatus,
      ) && <LoadingSpinner />}
    </div>
  );
};

StepSettingsAiConversation.displayName = 'StepSettingsAiConversation';
export { StepSettingsAiConversation };
