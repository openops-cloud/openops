import '@assistant-ui/react-markdown/styles/dot.css';

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import { t } from 'i18next';
import { memo, useCallback } from 'react';
import remarkGfm from 'remark-gfm';
import validator from 'validator';
import { Theme } from '../../../lib/theme';
import { CodeActions } from '../../code-actions';
import { createMarkdownComponents } from '../../custom/markdown-components';
import { CodeVariations, MarkdownCodeVariations } from '../../custom/types';
import { CodeMirrorEditor } from '../../json-editor';
import { getLanguageExtensionForCode } from '../../json-editor/code-mirror-utils';

import { cn } from '../../../lib/cn';
import { TooltipCopyButton } from '../tooltip-copy-button';

// Helper function to extract language from className
function extractLanguageFromClassName(className?: string): string | undefined {
  if (!className || typeof className !== 'string') {
    return undefined;
  }

  const languagePrefix = 'language-';
  const languageIndex = className.indexOf(languagePrefix);

  if (languageIndex === -1) {
    return undefined;
  }

  const startIndex = languageIndex + languagePrefix.length;
  const remainingString = className.substring(startIndex);

  const language = remainingString.split(/\s/)[0];
  return language.length > 0 ? language : undefined;
}

const CodeViewer = ({
  content,
  theme,
  className,
}: {
  content: string;
  theme: Theme;
  className?: string;
}) => {
  return (
    <CodeMirrorEditor
      value={content}
      readonly={true}
      showLineNumbers={false}
      height="auto"
      className="border border-solid rounded"
      containerClassName="h-auto"
      theme={theme}
      languageExtensions={getLanguageExtensionForCode(className)}
      showTabs={typeof content !== 'string' && 'packageJson' in content}
      editorLanguage={extractLanguageFromClassName(className)}
    />
  );
};

const LanguageUrl = ({ content, theme }: { content: string; theme: Theme }) => {
  if (
    validator.isURL(content, {
      require_protocol: true,
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

  return <CodeViewer content={content} theme={theme} />;
};

type MarkdownTextProps = {
  theme?: Theme;
  codeVariation?: CodeVariations;
  handleInject?: (codeContent: string) => void;
  textClassName?: string;
  listClassName?: string;
  linkClassName?: string;
};

const MarkdownTextImpl = ({
  theme = Theme.LIGHT,
  codeVariation = MarkdownCodeVariations.WithCopy,
  handleInject,
  textClassName,
  listClassName,
  linkClassName,
}: MarkdownTextProps) => {
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

  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      components={memoizeMarkdownComponents({
        code: function Code({ className, children, ...props }) {
          const isCodeBlock = useIsMarkdownCodeBlock();

          if (!isCodeBlock) {
            return (
              <code
                className={cn(
                  'bg-muted rounded border font-semibold',
                  className,
                )}
                {...props}
              >
                {children}
              </code>
            );
          }

          const isLanguageText = className?.includes('language');
          const isLanguageUrl = className?.includes('language-url');

          if (!children) {
            return null;
          }

          if (!isLanguageText && !isLanguageUrl) {
            return <code {...props} className="text-wrap" />;
          }

          const codeContent = String(children).trim();

          return (
            <div className="relative py-2 w-full flex flex-col">
              {isLanguageUrl ? (
                <LanguageUrl content={codeContent} theme={theme} />
              ) : (
                <CodeViewer
                  content={codeContent}
                  theme={theme}
                  className={className}
                />
              )}
              {codeVariation === MarkdownCodeVariations.WithCopy && (
                <TooltipCopyButton
                  content={codeContent}
                  tooltip={t('Copy')}
                  className="self-end"
                />
              )}
              {multilineVariation && (
                <CodeActions
                  content={codeContent}
                  onInject={
                    codeVariation === MarkdownCodeVariations.WithCopyAndInject
                      ? () => onInjectCode(codeContent)
                      : undefined
                  }
                  injectButtonText={t('Inject command')}
                  showInjectButton={
                    codeVariation === MarkdownCodeVariations.WithCopyAndInject
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
      })}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
