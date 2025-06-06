import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { Markdown, MarkdownCodeVariations } from '../custom';
import { AIChatMessage, AIChatMessageRole } from './types';

type AIChatMessagesProps = {
  messages: AIChatMessage[];
  onInject?: (code: string) => void;
  codeVariation?: MarkdownCodeVariations;
  lastUserMessageRef?: React.RefObject<HTMLDivElement>;
  lastAssistantMessageRef?: React.RefObject<HTMLDivElement>;
};

const getMessageRef = (
  message: AIChatMessage,
  messageIndex: number,
  messages: AIChatMessage[],
  lastUserMessageRef?: React.RefObject<HTMLDivElement>,
  lastAssistantMessageRef?: React.RefObject<HTMLDivElement>,
) => {
  if (!lastUserMessageRef || !lastAssistantMessageRef) {
    return undefined;
  }

  const lastUserMessageIndex = messages.map((m) => m.role).lastIndexOf('user');
  const lastAssistantMessageIndex = messages
    .map((m) => m.role)
    .lastIndexOf('assistant');

  if (message.role === 'user' && messageIndex === lastUserMessageIndex) {
    return lastUserMessageRef;
  }

  if (
    message.role === 'assistant' &&
    messageIndex === lastAssistantMessageIndex
  ) {
    return lastAssistantMessageRef;
  }

  return undefined;
};

const AIChatMessages = forwardRef<HTMLDivElement, AIChatMessagesProps>(
  (
    {
      messages,
      onInject,
      codeVariation = MarkdownCodeVariations.WithCopyMultiline,
      lastUserMessageRef,
      lastAssistantMessageRef,
    },
    ref,
  ) => {
    return (
      <div className="p-4 my-3 flex flex-col" ref={ref}>
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            onInject={onInject}
            codeVariation={codeVariation}
            ref={getMessageRef(
              message,
              index,
              messages,
              lastUserMessageRef,
              lastAssistantMessageRef,
            )}
          />
        ))}
      </div>
    );
  },
);

const Message = forwardRef<
  HTMLDivElement,
  {
    message: AIChatMessage;
    onInject?: (code: string) => void;
    codeVariation: MarkdownCodeVariations;
  }
>(({ message, onInject, codeVariation }, ref) => {
  const isUser = message.role === AIChatMessageRole.user;

  if (!isUser) {
    return (
      <div className="!my-2 text-black dark:text-white">
        <MessageContent
          content={message.content}
          onInject={onInject}
          codeVariation={codeVariation}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'ml-20 p-2 pb-4 px-4 rounded-lg',
        'bg-sky-50 dark:bg-slate-900 text-black dark:text-white',
      )}
    >
      <MessageContent
        content={message.content}
        onInject={onInject}
        codeVariation={codeVariation}
      />
    </div>
  );
});

Message.displayName = 'Message';

const MessageContent = ({
  content,
  onInject,
  codeVariation,
}: {
  content: string;
  onInject?: (code: string) => void;
  codeVariation: MarkdownCodeVariations;
}) => (
  <Markdown
    markdown={content}
    withBorder={false}
    codeVariation={codeVariation}
    handleInject={onInject}
    textClassName="text-sm"
    linkClassName="text-sm"
  />
);

AIChatMessages.displayName = 'AIChatMessages';
export { AIChatMessages };
