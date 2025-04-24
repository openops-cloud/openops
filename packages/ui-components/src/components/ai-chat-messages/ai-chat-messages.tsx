import { cn } from '../../lib/cn';
import { Markdown, MarkdownCodeVariations } from '../custom';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type AIChatMessagesProps = {
  messages: Message[];
  onInject: (code: string) => void;
};

const AIChatMessages = ({ messages, onInject }: AIChatMessagesProps) => {
  return (
    <div className="p-4 space-y-4 flex flex-col">
      {messages.map((message) => (
        <Message key={message.id} message={message} onInject={onInject} />
      ))}
    </div>
  );
};

const Message = ({
  message,
  onInject,
}: {
  message: Message;
  onInject: (code: string) => void;
}) => {
  const isUser = message.role === 'user';
  return (
    <div
      className={cn('p-4 pb-6 rounded-lg text-black dark:text-white', {
        'bg-blue-50 dark:bg-slate-900 self-start': isUser,
        'bg-gray-100 dark:bg-background self-end ml-auto': !isUser,
      })}
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
