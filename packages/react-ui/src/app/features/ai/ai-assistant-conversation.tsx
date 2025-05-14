import { MessageType } from '@/app/features/ai/lib/types';
import { UseChatHelpers } from '@ai-sdk/react';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  LoadingSpinner,
  MarkdownCodeVariations,
} from '@openops/components/ui';
import { useMemo } from 'react';

type AiAssistantConversationnProps = {
  isPending: boolean;
  messages: MessageType[];
} & Pick<UseChatHelpers, 'status'>;

const ChatStatus = {
  STREAMING: 'streaming',
  SUBMITTED: 'submitted',
};

const AiAssistantConversation = ({
  messages,
  status,
  isPending,
}: AiAssistantConversationnProps) => {
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
    <div className="flex flex-col gap-2">
      <AIChatMessages
        messages={uiMessages}
        codeVariation={MarkdownCodeVariations.WithCopyMultiline}
      />
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status) && (
        <LoadingSpinner />
      )}
    </div>
  );
};

AiAssistantConversation.displayName = 'AiAssistantConversation';
export { AiAssistantConversation };
