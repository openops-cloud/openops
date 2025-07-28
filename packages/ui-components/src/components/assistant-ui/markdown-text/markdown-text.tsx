import '@assistant-ui/react-markdown/styles/dot.css';

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import { t } from 'i18next';
import { memo, useCallback, useMemo } from 'react';
import remarkGfm from 'remark-gfm';
import { Theme } from '../../../lib/theme';
import { CodeActions } from '../../code-actions';
import { createMarkdownComponents } from '../../custom/markdown-components';
import { CodeVariations, MarkdownCodeVariations } from '../../custom/types';

import { cn } from '../../../lib/cn';
import { MarkdownCodeViewer } from '../../custom/markdown-code-viewer';
import { TooltipCopyButton } from '../tooltip-copy-button';

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
    onInjectCode: (codeContent: string) => void;
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
    const multilineVariation =
      codeVariation === MarkdownCodeVariations.WithCopyAndInject ||
      codeVariation === MarkdownCodeVariations.WithCopyMultiline;

    return (
      <div className="relative py-2 w-full flex flex-col">
        {isStreaming ? (
          // During streaming: Use simple pre-formatted text to avoid CodeMirror re-renders
          <pre
            className={cn(
              'border border-solid rounded bg-background p-3 text-sm overflow-x-auto',
              'font-mono whitespace-pre-wrap break-words',
              'min-h-[120px]', // Reserve minimum space to prevent layout shift
            )}
          >
            <code className={className}>{codeContent}</code>
          </pre>
        ) : (
          <MarkdownCodeViewer
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
  handleInject?: (codeContent: string) => void;
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
      code: (props: any) => (
        <CodeComponent
          {...props}
          theme={theme}
          codeVariation={codeVariation}
          onInjectCode={onInjectCode}
          status={status}
        />
      ),
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
