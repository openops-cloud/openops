import '@assistant-ui/react-markdown/styles/dot.css';

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import { t } from 'i18next';
import { memo, useCallback } from 'react';
import remarkGfm from 'remark-gfm';
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

type MarkdownTextProps = {
  theme: Theme;
  codeVariation?: CodeVariations;
  handleInject?: (codeContent: string) => void;
  textClassName?: string;
  listClassName?: string;
  linkClassName?: string;
};

const MarkdownTextImpl = ({
  theme,
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

          if (!children) {
            return null;
          }

          const codeContent = String(children).trim();

          return (
            <div className="relative py-2 w-full flex flex-col">
              <CodeViewer
                content={codeContent}
                theme={theme}
                className={className}
              />
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
