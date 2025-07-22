import { SourceCode } from '@openops/shared';
import { t } from 'i18next';
import { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { Theme } from '../../lib/theme';
import { CodeActions } from '../code-actions';
import { Markdown, MarkdownCodeVariations } from '../custom';
import { CodeMirrorEditor, getLanguageExtensionForCode } from '../json-editor';
import {
  AIChatMessage,
  AIChatMessageContent,
  AIChatMessageRole,
} from './types';

type AIChatMessagesProps = {
  messages: AIChatMessage[];
  onInject?: (code: string | SourceCode) => void;
  codeVariation?: MarkdownCodeVariations;
  lastUserMessageRef?: React.RefObject<HTMLDivElement>;
  lastAssistantMessageRef?: React.RefObject<HTMLDivElement>;
  theme: Theme;
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
    onInject?: (code: string | SourceCode) => void;
    codeVariation: MarkdownCodeVariations;
    theme: Theme;
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
  content: AIChatMessageContent;
  onInject?: (code: string | SourceCode) => void;
  codeVariation: MarkdownCodeVariations;
  theme: Theme;
}) => {
  if (typeof content === 'string') {
    return (
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
  }

  if (content && Array.isArray(content.parts) && content.parts.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {content.parts.map((part, index) => {
          const getContentPreview = () => {
            if (typeof part.content === 'string') {
              return part.content.substring(0, 20).replace(/\s/g, '');
            }
            if (typeof part.content === 'object' && part.content.code) {
              return part.content.code.substring(0, 20).replace(/\s/g, '');
            }
            return 'unknown';
          };
          const stableKey = `${part.type}-${index}-${getContentPreview()}`;

          switch (part.type) {
            case 'text':
              return (
                <Markdown
                  key={stableKey}
                  markdown={part.content}
                  withBorder={false}
                  codeVariation={codeVariation}
                  handleInject={onInject}
                  textClassName="text-sm"
                  linkClassName="text-sm"
                  theme={theme}
                />
              );
            case 'sourcecode':
              return (
                <div key={stableKey} className="relative py-2 w-full">
                  <CodeMirrorEditor
                    value={part.content}
                    readonly={true}
                    showLineNumbers={false}
                    height="auto"
                    className="border border-solid rounded"
                    containerClassName="h-auto"
                    theme={theme}
                    showTabs={true}
                    languageExtensions={getLanguageExtensionForCode(
                      'typescript',
                    )}
                    editorLanguage="typescript"
                  />
                  <CodeActions
                    content={part.content?.code ?? ''}
                    onInject={
                      onInject ? (_) => onInject(part.content) : undefined
                    }
                    injectButtonText={t('Use code')}
                  />
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  }

  return null;
};

AIChatMessages.displayName = 'AIChatMessages';
export { AIChatMessages };
