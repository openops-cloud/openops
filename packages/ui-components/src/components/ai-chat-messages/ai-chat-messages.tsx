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
  theme: string;
};

const AIChatMessages = forwardRef<HTMLDivElement, AIChatMessagesProps>(
  (
    {
      messages,
      onInject,
      codeVariation = MarkdownCodeVariations.WithCopyMultiline,
      lastUserMessageRef,
      lastAssistantMessageRef,
      theme,
    },
    ref,
  ) => {
    const lastUserMessageIndex = messages
      .map((m) => m.role)
      .lastIndexOf(AIChatMessageRole.user);
    const lastAssistantMessageIndex = messages
      .map((m) => m.role)
      .lastIndexOf(AIChatMessageRole.assistant);

    const getMessageRef = (messageIndex: number, messageRole: string) => {
      if (!lastUserMessageRef || !lastAssistantMessageRef) {
        return undefined;
      }

      if (
        messageRole === AIChatMessageRole.user &&
        messageIndex === lastUserMessageIndex
      ) {
        return lastUserMessageRef;
      }

      if (
        messageRole === AIChatMessageRole.assistant &&
        messageIndex === lastAssistantMessageIndex
      ) {
        return lastAssistantMessageRef;
      }

      return undefined;
    };

    return (
      <div className="p-4 my-3 flex flex-col" ref={ref}>
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            onInject={onInject}
            codeVariation={codeVariation}
            ref={getMessageRef(index, message.role)}
            theme={theme}
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
    theme: string;
  }
>(({ message, onInject, codeVariation, theme }, ref) => {
  const isUser = message.role === AIChatMessageRole.user;

  if (!isUser) {
    return (
      <div className="!my-2 text-black dark:text-white" ref={ref}>
        <MessageContent
          content={message.content}
          onInject={onInject}
          codeVariation={codeVariation}
          theme={theme}
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
        theme={theme}
      />
    </div>
  );
});

Message.displayName = 'Message';

const MessageContent = ({
  content,
  onInject,
  codeVariation,
  theme,
}: {
  content: string;
  onInject?: (code: string) => void;
  codeVariation: MarkdownCodeVariations;
  theme: string;
}) => (
  <Markdown
    markdown={content}
    withBorder={false}
    codeVariation={codeVariation}
    handleInject={onInject}
    textClassName="text-sm"
    linkClassName="text-sm"
    theme={theme}
  />
);

AIChatMessages.displayName = 'AIChatMessages';
export { AIChatMessages };
