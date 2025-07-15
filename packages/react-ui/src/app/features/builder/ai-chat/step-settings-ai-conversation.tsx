import { useTheme } from '@/app/common/providers/theme-provider';
import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from '@ai-sdk/ui-utils';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  ChatStatus,
  LoadingSpinner,
  MarkdownCodeVariations,
  tryParseJson,
} from '@openops/components/ui';
import { CodeSchema, OpenChatResponse, SourceCode } from '@openops/shared';
import { useCallback, useMemo } from 'react';
import { useBuilderStateContext } from '../builder-hooks';

type ConversationProps = {
  isPending: boolean;
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
  lastAssistantMessageRef: React.RefObject<HTMLDivElement>;
} & Pick<UseChatHelpers, 'messages' | 'status'>;

type ServerMessage = NonNullable<OpenChatResponse['messages']>[number];
type MessageType = ServerMessage | UIMessage;

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
      // todo
      if (message.role.toLowerCase() === AIChatMessageRole.assistant) {
        const parsed = tryParseJson(message.content) as CodeSchema;

        if (parsed && parsed.code && parsed.description) {
          return {
            id: message && 'id' in message ? message.id : String(idx),
            role: AIChatMessageRole.assistant,
            content: {
              parts: [
                {
                  type: 'sourcecode',
                  content: parsed,
                },
                {
                  type: 'text',
                  content: parsed.description,
                },
              ],
            },
          };
        }
      }
      return {
        id: message && 'id' in message ? message.id : String(idx),
        role:
          message.role.toLowerCase() === 'user'
            ? AIChatMessageRole.user
            : AIChatMessageRole.assistant,
        content: Array.isArray(message.content)
          ? message.content.map((c) => c.text).join()
          : message.content,
      };
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
