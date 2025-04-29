import { Alert, AlertDescription } from '../../ui/alert';

import { Button } from '../../ui/button';
import { useToast } from '../../ui/use-toast';

import { t } from 'i18next';
import { Copy, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import validator from 'validator';
import { clipboardUtils } from '../../lib/clipboard-utils';
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
  codeVariation?: CodeVariations;
  handleInject?: (codeContent: string) => void;
};

const Container = ({
  withBorder,
  children,
}: {
  withBorder: boolean;
  children: React.ReactNode;
}) =>
  withBorder ? (
    <Alert className="rounded">
      <AlertDescription className="w-full">{children}</AlertDescription>
    </Alert>
  ) : (
    children
  );

const LanguageText = ({
  content,
  codeVariation,
}: {
  content: string;
  codeVariation?: CodeVariations;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isInjectVariation =
    codeVariation === MarkdownCodeVariations.WithCopyAndInject;

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      const resizeObserver = new ResizeObserver(() => {
        const lineCount = textarea.value.split('\n').length;
        const isSingleLine = lineCount === 1;

        textarea.style.height = 'auto';
        const newHeight = isSingleLine
          ? textarea.scrollHeight
          : textarea.scrollHeight + 16; // adding the extra padding
        textarea.style.height = `${newHeight}px`;

        if (isSingleLine) {
          textarea.style.lineHeight = `32px`;
          textarea.style.paddingTop = '0';
          textarea.style.paddingBottom = '0';
        } else {
          textarea.style.lineHeight = '';
          textarea.style.paddingTop = '8px';
          textarea.style.paddingBottom = '8px';
        }
      });

      resizeObserver.observe(textarea);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [content]);

  if (isInjectVariation) {
    return (
      <textarea
        ref={textareaRef}
        className="px-3 border text-sm block w-full resize-none leading-tight bg-input rounded-lg border-none"
        value={content}
        disabled
      />
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
      <Container withBorder={withBorder}>
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
                      codeVariation={codeVariation}
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
                  {codeVariation ===
                    MarkdownCodeVariations.WithCopyAndInject && (
                    <div className="flex gap-2 items-center justify-end mt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded p-2 inline-flex items-center justify-center text-xs font-sans"
                        onClick={() => onInjectCode(codeContent)}
                      >
                        <Plus className="w-4 h-4" />
                        {t('Inject command')}
                      </Button>
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
                className="leading-7 mt-2 [&:not(:first-child)]:my-2"
                {...props}
              />
            ),
            ul: ({ node, ...props }) => (
              <ul className="my-2 ml-6 list-disc [&>li]:mt-2" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />
            ),
            li: ({ node, ...props }) => <li {...props} />,
            a: ({ node, ...props }) => (
              <a
                className="font-medium text-primary underline underline-offset-4"
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
