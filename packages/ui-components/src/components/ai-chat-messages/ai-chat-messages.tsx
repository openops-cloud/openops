import { cn } from '../../lib/cn';
import { Markdown, MarkdownCodeVariations } from '../custom';
import { AIChatMessage, AIChatMessageRole } from './types';

type AIChatMessagesProps = {
  messages: AIChatMessage[];
  onInject?: (code: string) => void;
  codeVariation?: MarkdownCodeVariations;
};

const AIChatMessages = ({
  messages,
  onInject,
  codeVariation = MarkdownCodeVariations.WithCopyMultiline,
}: AIChatMessagesProps) => (
  <div className="p-4 my-3 flex flex-col">
    {messages.map((message) => (
      <Message
        key={message.id}
        message={message}
        onInject={onInject}
        codeVariation={codeVariation}
      />
    ))}
  </div>
);

const Message = ({
  message,
  onInject,
  codeVariation,
}: {
  message: AIChatMessage;
  onInject?: (code: string) => void;
  codeVariation: MarkdownCodeVariations;
}) => {
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
};

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
  />
);

AIChatMessages.displayName = 'AIChatMessages';
export { AIChatMessages };
