import { cn } from '../../lib/cn';
import { Markdown, MarkdownCodeVariations } from '../custom';

export type AIChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type AIChatMessagesProps = {
  messages: AIChatMessage[];
  onInject: (code: string) => void;
};

const AIChatMessages = ({ messages, onInject }: AIChatMessagesProps) => (
  <div className="p-4 my-3 flex flex-col">
    {messages.map((message) => (
      <Message key={message.id} message={message} onInject={onInject} />
    ))}
  </div>
);

const Message = ({
  message,
  onInject,
}: {
  message: AIChatMessage;
  onInject: (code: string) => void;
}) => {
  const isUser = message.role === 'user';

  if (!isUser) {
    return (
      <div className="!my-2 text-black dark:text-white">
        <Markdown
          markdown={message.content}
          withBorder={false}
          codeVariation={MarkdownCodeVariations.WithCopyAndInject}
          handleInject={onInject}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 pb-6 rounded-lg',
        'bg-sky-50 dark:bg-slate-900 text-black dark:text-white',
      )}
    >
      <Markdown
        markdown={message.content}
        withBorder={false}
        codeVariation={MarkdownCodeVariations.WithCopyAndInject}
        handleInject={onInject}
      />
    </div>
  );
};

AIChatMessages.displayName = 'AIChatMessages';
export { AIChatMessages };
