import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import { t } from 'i18next';
import { lazy, memo, Suspense, useCallback } from 'react';
import remarkGfm from 'remark-gfm';
import { Theme } from '../../../lib/theme';
import { CodeActions } from '../../code-actions';
import { createMarkdownComponents } from '../../custom/markdown-components';
import { CodeVariations, MarkdownCodeVariations } from '../../custom/types';

import { cn } from '../../../lib/cn';
import { MarkdownCodeViewer } from '../../custom/markdown-code-viewer';
import { toolStatusUtils } from '../tool-status';
import { TooltipCopyButton } from '../tooltip-copy-button';

// Lazy load MermaidRenderer to reduce initial bundle size
const MermaidRenderer = lazy(() =>
  import('../mermaid-renderer').then((module) => ({
    default: module.MermaidRenderer,
  })),
);

const CodeComponent = ({
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
  const isStreaming = toolStatusUtils.isRunning(status);

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

  // Check if this is a mermaid diagram
  const language = className?.match(/language-(\w+)/)?.[1];
  const isMermaid = language === 'mermaid';

  return (
    <div className="relative py-2 w-full flex flex-col">
      {isStreaming && !isMermaid ? (
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
      ) : isMermaid ? (
        <Suspense
          fallback={
            <div
              className={cn(
                'border border-solid rounded bg-background p-4',
                'text-muted-foreground text-sm animate-pulse',
                'min-h-[120px] flex items-center justify-center',
              )}
            >
              {t('Loading diagram...')}
            </div>
          }
        >
          <MermaidRenderer chart={codeContent} theme={theme} />
        </Suspense>
      ) : (
        <MarkdownCodeViewer
          content={codeContent}
          theme={theme}
          className={className}
        />
      )}
      {!isStreaming &&
        !isMermaid &&
        codeVariation === MarkdownCodeVariations.WithCopy && (
          <TooltipCopyButton
            content={codeContent}
            tooltip={t('Copy')}
            className="self-end"
          />
        )}
      {!isStreaming && !isMermaid && multilineVariation && (
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
};
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

  const CodeComponentWithStatus = useCallback(
    (props: any) => {
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
    [theme, codeVariation, onInjectCode, status],
  );

  const components = {
    code: CodeComponentWithStatus,
    ...memoizeMarkdownComponents({
      ...createMarkdownComponents({
        textClassName,
        listClassName,
        linkClassName,
      }),
    }),
  };

  return (
    <MarkdownTextPrimitive
      key={status?.type}
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      components={components}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
