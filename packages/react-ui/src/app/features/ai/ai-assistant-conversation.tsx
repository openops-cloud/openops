import { MessageType } from '@/app/features/ai/lib/types';
import { UseChatHelpers } from '@ai-sdk/react';
import {
  AIChatMessage,
  AIChatMessageRole,
  AIChatMessages,
  LoadingSpinner,
  MarkdownCodeVariations,
} from '@openops/components/ui';
import { useMemo, useRef } from 'react';

type AiAssistantConversationnProps = {
  isPending: boolean;
  messages: MessageType[];
  parentHeight: number;
  lastUserMessageRef: React.RefObject<HTMLDivElement>;
  lastAssistantMessageRef: React.RefObject<HTMLDivElement>;
} & Pick<UseChatHelpers, 'status'>;

const ChatStatus = {
  STREAMING: 'streaming',
  SUBMITTED: 'submitted',
};

const AiAssistantConversation = ({
  messages,
  status,
  isPending,
  lastUserMessageRef,
  lastAssistantMessageRef,
}: AiAssistantConversationnProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col gap-2" ref={containerRef}>
      <AIChatMessages
        messages={uiMessages}
        codeVariation={MarkdownCodeVariations.WithCopyMultiline}
        lastUserMessageRef={lastUserMessageRef}
        lastAssistantMessageRef={lastAssistantMessageRef}
      />
      {[ChatStatus.STREAMING, ChatStatus.SUBMITTED].includes(status) && (
        <LoadingSpinner />
      )}
    </div>
  );
};

AiAssistantConversation.displayName = 'AiAssistantConversation';
export { AiAssistantConversation };
