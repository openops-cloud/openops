import '@assistant-ui/react-markdown/styles/dot.css';

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import { SourceCode } from '@openops/shared';
import { t } from 'i18next';
import { memo, useCallback, useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import { Theme } from '../../../lib/theme';
import { CodeActions } from '../../code-actions';
import { createMarkdownComponents } from '../../custom/markdown-components';
import { CodeVariations, MarkdownCodeVariations } from '../../custom/types';
import { CodeMirrorEditor } from '../../json-editor';
import { getLanguageExtensionForCode } from '../../json-editor/code-mirror-utils';

import { cn } from '../../../lib/cn';
import { TooltipCopyButton } from '../tooltip-copy-button';

// todo - reuse this
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

// todo extract
const CodeViewer = memo(
  ({
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
  },
);
CodeViewer.displayName = 'CodeViewer';

// Extracted Code component to prevent recreation on every render
const CodeComponent = memo(
  ({
    className,
    children,
    theme,
    codeVariation,
    onInjectCode,
    status,
    ...props
  }: {
    className?: string;
    children?: React.ReactNode;
    theme: Theme;
    codeVariation: CodeVariations;
    // todo correct signature everywhere
    onInjectCode: (codeContent: string | SourceCode) => void;
    status?: { type: string; reason?: string };
    [key: string]: any;
  }) => {
    const isCodeBlock = useIsMarkdownCodeBlock();
    const isStreaming = status?.type === 'running';

    if (!isCodeBlock) {
      return (
        <code
          className={cn('bg-muted rounded border font-semibold', className)}
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
    console.log('codeContent', codeContent);
    const multilineVariation =
      codeVariation === MarkdownCodeVariations.WithCopyAndInject ||
      codeVariation === MarkdownCodeVariations.WithCopyMultiline;

    return (
      <div className="relative py-2 w-full flex flex-col">
        {isStreaming ? (
          // during streaming: use simple pre-formatted text to avoid CodeMirror re-renders & layout shift issues
          <pre
            className={cn(
              'border border-solid rounded bg-background p-3 text-sm overflow-x-auto',
              'font-mono whitespace-pre-wrap break-words',
              'min-h-[120px]', // reserve minimum space to prevent layout shift
            )}
          >
            <code className={className}>{codeContent}</code>
          </pre>
        ) : (
          <CodeViewer
            content={codeContent}
            theme={theme}
            className={className}
          />
        )}
        {!isStreaming && codeVariation === MarkdownCodeVariations.WithCopy && (
          <TooltipCopyButton
            content={codeContent}
            tooltip={t('Copy')}
            className="self-end"
          />
        )}
        {!isStreaming && multilineVariation && (
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
);
CodeComponent.displayName = 'CodeComponent';

type MarkdownTextProps = {
  theme: Theme;
  codeVariation?: CodeVariations;
  handleInject?: (codeContent: string | SourceCode) => void;
  textClassName?: string;
  listClassName?: string;
  linkClassName?: string;
  status?: { type: string; reason?: string };
};

const MarkdownTextImpl = ({
  theme,
  codeVariation = MarkdownCodeVariations.WithCopy,
  handleInject,
  textClassName,
  listClassName,
  linkClassName,
  status,
}: MarkdownTextProps) => {
  const onInjectCode = useCallback(
    (codeContent: string) => {
      if (codeContent && handleInject && typeof handleInject === 'function') {
        handleInject(codeContent);
      }
    },
    [handleInject],
  );

  const memoizedComponents = useMemo(() => {
    return memoizeMarkdownComponents({
      code: (props: any) => {
        console.log('MarkdownTextImpl -> code', props);
        return (
          <CodeComponent
            {...props}
            theme={theme}
            codeVariation={codeVariation}
            onInjectCode={onInjectCode}
            status={status}
          />
        );
      },
      ...createMarkdownComponents({
        textClassName,
        listClassName,
        linkClassName,
      }),
    });
  }, [
    theme,
    codeVariation,
    onInjectCode,
    textClassName,
    listClassName,
    linkClassName,
    status,
  ]);

  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      components={memoizedComponents}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
