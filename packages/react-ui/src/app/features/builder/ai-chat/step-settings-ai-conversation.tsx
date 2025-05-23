import { QueryKeys } from '@/app/constants/query-keys';
import { UseChatHelpers } from '@ai-sdk/react';
import { UIMessage } from '@ai-sdk/ui-utils';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  LoadingSpinner,
  MarkdownCodeVariations,
} from '@openops/components/ui';
import { OpenChatResponse } from '@openops/shared';
import { useCallback, useMemo } from 'react';
import { useBuilderStateContext } from '../builder-hooks';

type ConversationProps = {
  isPending: boolean;
} & Pick<UseChatHelpers, 'messages' | 'status'>;

type ServerMessage = NonNullable<OpenChatResponse['messages']>[number];
type MessageType = ServerMessage | UIMessage;

const ChatStatus = {
  STREAMING: 'streaming',
  SUBMITTED: 'submitted',
};

const StepSettingsAiConversation = ({
  messages,
  status,
  isPending,
}: ConversationProps) => {
  const dispatch = useBuilderStateContext((state) => state.applyMidpanelAction);

  const onInject = useCallback(
    (code: string) => {
      dispatch({ type: 'ADD_CODE_TO_INJECT', code });
    },
    [dispatch],
  );

  const uiMessages: AIChatMessage[] = useMemo(() => {
    return messages.map((message: MessageType, idx) => ({
      id: message && 'id' in message ? message.id : String(idx),
      role:
        message.role.toLowerCase() === 'user'
          ? AIChatMessageRole.user
          : AIChatMessageRole.assistant,
      content: Array.isArray(message.content)
        ? message.content.map((c) => c.text).join()
        : message.content,
    }));
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
      />
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status) && (
        <LoadingSpinner />
      )}
    </div>
  );
};

StepSettingsAiConversation.displayName = 'StepSettingsAiConversation';
export { StepSettingsAiConversation };
