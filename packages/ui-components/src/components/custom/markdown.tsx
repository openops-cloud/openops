import { Alert, AlertDescription } from '../../ui/alert';

import { Button } from '../../ui/button';
import { useToast } from '../../ui/use-toast';

import { t } from 'i18next';
import { Copy, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import validator from 'validator';
import { clipboardUtils } from '../../lib/clipboard-utils';
import { cn } from '../../lib/cn';
import { COPY_PASTE_TOAST_DURATION } from '../../lib/constants';
import { CodeVariations, MarkdownCodeVariations } from './types';

function applyVariables(markdown: string, variables: Record<string, string>) {
  return markdown
    .replaceAll('<br>', '\n')
    .replaceAll(/\{\{(.*?)\}\}/g, (_, variableName) => {
      return variables[variableName] ?? '';
    });
}

type MarkdownProps = {
  markdown: string | undefined;
  variables?: Record<string, string>;
  className?: string;
  withBorder?: boolean;
  containerClassName?: string;
  textClassName?: string;
  listClassName?: string;
  linkClassName?: string;
  codeVariation?: CodeVariations;
  handleInject?: (codeContent: string) => void;
};

const Container = ({
  withBorder,
  children,
  className,
}: {
  withBorder: boolean;
  className?: string;
  children: React.ReactNode;
}) =>
  withBorder ? (
    <Alert className={cn('rounded', className)}>
      <AlertDescription className="w-full">{children}</AlertDescription>
    </Alert>
  ) : (
    children
  );

const LanguageText = ({
  content,
  multilineVariation = false,
}: {
  content: string;
  multilineVariation?: boolean;
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = divRef.current;
    if (div) {
      const updateHeight = () => {
        requestAnimationFrame(() => {
          div.style.height = 'auto';
          div.style.height =
            div.scrollHeight > 32 ? div.scrollHeight + 'px' : '32px';
        });
      };

      const observer = new ResizeObserver(updateHeight);
      observer.observe(div);

      updateHeight();

      return () => {
        observer.disconnect();
      };
    }
  }, [content]);

  if (multilineVariation) {
    return (
      <div
        ref={divRef}
        className="p-4 text-sm block w-full leading-tight bg-input rounded-lg border-none overflow-y-hidden resize-none"
        contentEditable={false}
        role="textbox"
        suppressContentEditableWarning
      >
        {content}
      </div>
    );
  }

  return (
    <input
      type="text"
      className="col-span-6 bg-background border border-solid text-sm rounded block w-full p-2.5"
      value={content}
      disabled
    />
  );
};
const LanguageUrl = ({ content }: { content: string }) => {
  if (
    validator.isURL(content, {
      require_protocol: true,
      // localhost links lack a tld
      require_tld: false,
    })
  ) {
    return (
      <a
        href={content}
        target="_blank"
        rel="noopener noreferrer"
        className="col-span-6 bg-background border border-solid text-sm rounded block w-full p-2.5 truncate hover:underline"
      >
        <span className="w-[calc(100%-23px)] inline-flex truncate">
          {content}
        </span>
      </a>
    );
  }

  return <LanguageText content={content} />;
};

/*
  Renders a markdown component with support for variables and language text.
*/
const Markdown = React.memo(
  ({
    markdown,
    variables,
    withBorder = true,
    codeVariation = MarkdownCodeVariations.WithCopy,
    containerClassName,
    listClassName,
    textClassName,
    linkClassName,
    handleInject,
  }: MarkdownProps) => {
    const { toast } = useToast();

    const showCopySuccessToast = () =>
      toast({
        title: t('Copied to clipboard'),
        duration: COPY_PASTE_TOAST_DURATION,
      });

    const showCopyFailureToast = () =>
      toast({
        title: t('Failed to copy to clipboard'),
        duration: COPY_PASTE_TOAST_DURATION,
      });

    const copyToClipboard = (text: string) => {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(text)
          .then(showCopySuccessToast)
          .catch(showCopyFailureToast);
      } else {
        clipboardUtils.copyInInsecureContext({
          text,
          onSuccess: showCopySuccessToast,
          onError: showCopyFailureToast,
        });
      }
    };
    const multilineVariation =
      codeVariation === MarkdownCodeVariations.WithCopyAndInject ||
      codeVariation === MarkdownCodeVariations.WithCopyMultiline;

    const onInjectCode = useCallback(
      (codeContent: string) => {
        if (codeContent && handleInject && typeof handleInject === 'function') {
          handleInject(codeContent);
        }
      },
      [handleInject],
    );

    if (!markdown) {
      return null;
    }

    const markdownProcessed = applyVariables(markdown, variables ?? {});
    return (
      <Container withBorder={withBorder} className={containerClassName}>
        <ReactMarkdown
          components={{
            code(props) {
              const isLanguageText = props.className?.includes('language');
              const isLanguageUrl = props.className?.includes('language-url');

              if (!props.children) {
                return null;
              }

              if (!isLanguageText && !isLanguageUrl) {
                return <code {...props} className="text-wrap" />;
              }

              const codeContent = String(props.children).trim();

              return (
                <div className="relative py-2 w-full">
                  {isLanguageUrl ? (
                    <LanguageUrl content={codeContent} />
                  ) : (
                    <LanguageText
                      content={codeContent}
                      multilineVariation={multilineVariation}
                    />
                  )}
                  {codeVariation === MarkdownCodeVariations.WithCopy && (
                    <Button
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background rounded p-2 inline-flex items-center justify-center"
                      onClick={() => copyToClipboard(codeContent)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                  {multilineVariation && (
                    <div className="flex gap-2 items-center justify-end mt-1">
                      {codeVariation ===
                        MarkdownCodeVariations.WithCopyAndInject && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded p-2 inline-flex items-center justify-center text-xs font-sans"
                          onClick={() => onInjectCode(codeContent)}
                        >
                          <Plus className="w-4 h-4" />
                          {t('Inject command')}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded p-2 inline-flex items-center justify-center"
                        onClick={() => copyToClipboard(codeContent)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            },
            h1: ({ node, ...props }) => (
              <h1
                className="scroll-m-20 text-3xl font-bold tracking-tight mt-1"
                {...props}
              />
            ),
            h2: ({ node, ...props }) => (
              <h2
                className="scroll-m-20 text-2xl font-semibold tracking-tight mt-4"
                {...props}
              />
            ),
            h3: ({ node, ...props }) => (
              <h3
                className="scroll-m-20 text-xl font-semibold tracking-tight mt-2"
                {...props}
              />
            ),
            p: ({ node, ...props }) => (
              <p
                className={cn(
                  'leading-7 mt-2 [&:not(:first-child)]:my-2',
                  textClassName,
                )}
                {...props}
              />
            ),
            ul: ({ node, ...props }) => (
              <ul
                className={cn('my-2 ml-6 list-disc [&>li]:mt-2', listClassName)}
                {...props}
              />
            ),
            ol: ({ node, ...props }) => (
              <ol
                className={cn(
                  'my-6 ml-6 list-decimal [&>li]:mt-2',
                  listClassName,
                )}
                {...props}
              />
            ),
            li: ({ node, ...props }) => (
              <li className={cn(textClassName)} {...props} />
            ),
            a: ({ node, ...props }) => (
              <a
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'font-medium text-primary underline underline-offset-4',
                  linkClassName,
                )}
                {...props}
              />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="mt-6 border-l-2 pl-6 italic" {...props} />
            ),
          }}
        >
          {markdownProcessed}
        </ReactMarkdown>
      </Container>
    );
  },
);

Markdown.displayName = 'Markdown';
export { Markdown };
