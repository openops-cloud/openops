import { t } from 'i18next';
import { Copy } from 'lucide-react';
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import validator from 'validator';
import { useCopyToClipboard } from '../../hooks/use-copy-to-clipboard';
import { cn } from '../../lib/cn';
import { Theme } from '../../lib/theme';
import { Alert, AlertDescription } from '../../ui/alert';
import { Button } from '../../ui/button';
import { CodeActions } from '../code-actions';
import { MarkdownCodeViewer } from './markdown-code-viewer';
import { createMarkdownComponents } from './markdown-components';
import { CodeVariations, MarkdownCodeVariations } from './types';
import { applyVariables } from './utils';

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
  theme: Theme;
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

const LanguageUrl = ({ content, theme }: { content: string; theme: Theme }) => {
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

  return <MarkdownCodeViewer content={content} theme={theme} />;
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
    theme,
  }: MarkdownProps) => {
    const { copyToClipboard } = useCopyToClipboard();

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
          disallowedElements={['pre']}
          unwrapDisallowed
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
                    <LanguageUrl content={codeContent} theme={theme} />
                  ) : (
                    <MarkdownCodeViewer
                      content={codeContent}
                      theme={theme}
                      className={props.className}
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
                    <CodeActions
                      content={codeContent}
                      onInject={
                        codeVariation ===
                        MarkdownCodeVariations.WithCopyAndInject
                          ? () => onInjectCode(codeContent)
                          : undefined
                      }
                      injectButtonText={t('Inject command')}
                      showInjectButton={
                        codeVariation ===
                        MarkdownCodeVariations.WithCopyAndInject
                      }
                    />
                  )}
                </div>
              );
            },
            ...createMarkdownComponents({
              textClassName,
              listClassName,
              linkClassName,
            }),
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
