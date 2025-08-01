import Editor from '@monaco-editor/react';
import { SourceCode } from '@openops/shared';
import { t } from 'i18next';
import { editor } from 'monaco-editor';
import React, {
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { cn } from '../../lib/cn';
import { convertToString, isSourceCodeObject } from './code-utils';
import { MonacoLanguage } from './types';

type CodeEditorProps = {
  value: unknown;
  readonly?: boolean;
  onFocus?: (ref: RefObject<any>) => void;
  onChange?: (value: string | SourceCode) => void;
  className?: string;
  containerClassName?: string;
  theme: string;
  placeholder?: string;
  showLineNumbers?: boolean;
  language?: MonacoLanguage;
  showTabs?: boolean;
};

export interface CodeEditorRef {
  layout: () => void;
  focus: () => void;
}

const CodeEditor = React.forwardRef<CodeEditorRef, CodeEditorProps>(
  (
    {
      value,
      readonly = false,
      onFocus,
      onChange,
      className,
      containerClassName,
      theme,
      placeholder,
      showLineNumbers = true,
      language = 'json',
      showTabs = false,
    }: CodeEditorProps,
    ref: React.Ref<CodeEditorRef>,
  ) => {
    const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const editorWrapperRef = useRef<HTMLDivElement>(null);
    const rafIdRef = useRef<number | null>(null);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(false);
    const [hasTextFocus, setHasTextFocus] = useState(false);

    const isStringValue = typeof value === 'string';
    const sourceCodeObject = isSourceCodeObject(value) ? value : null;
    const shouldShowTabs = showTabs && sourceCodeObject !== null;
    const [activeTab, setActiveTab] = useState<keyof SourceCode>('code');

    const [currentLanguage, setCurrentLanguage] =
      useState<MonacoLanguage>(language);

    const { code, packageJson } = isStringValue
      ? { code: value, packageJson: undefined }
      : sourceCodeObject || { code: convertToString(value), packageJson: '{}' };

    const formatValue = (value: unknown): string => {
      if (typeof value === 'string') {
        return value;
      }

      if (['json', 'javascript', 'typescript'].includes(currentLanguage)) {
        return convertToString(value);
      }

      return String(value);
    };

    const rafLayout = useCallback(() => {
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (editorRef.current) {
            editorRef.current.layout({ width: 0, height: 0 });
            editorRef.current.layout();
          }
        });
      }
    }, []);

    const currentValue = activeTab === 'code' ? code : packageJson;
    const isReadOnly = readonly || activeTab === 'packageJson';
    const hasContent = currentValue && String(currentValue).trim() !== '';

    useEffect(() => {
      if (placeholder && !hasContent && !hasTextFocus && !isReadOnly) {
        setShowPlaceholder(true);
      } else {
        setShowPlaceholder(false);
      }
    }, [placeholder, hasContent, hasTextFocus, isReadOnly]);

    // Cleanup any pending animation frames on unmount
    useEffect(() => {
      return () => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }, []);

    const handleTabClick = (tab: keyof SourceCode) => {
      setActiveTab(tab);
      setCurrentLanguage(tab === 'packageJson' ? 'json' : 'typescript');
    };

    // ResizeObserver for container changes
    useEffect(() => {
      if (!containerRef.current || typeof ResizeObserver === 'undefined')
        return;

      const resizeObserver = new ResizeObserver(() => {
        // Use requestAnimationFrame for performance, following modern best practices
        rafLayout();
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, [isEditorReady, rafLayout]);

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      setIsEditorReady(true);

      editor.onDidFocusEditorText(() => {
        setHasTextFocus(true);
        onFocus?.(editorRef);
      });

      editor.onDidBlurEditorWidget(() => {
        setHasTextFocus(false);
      });

      // Initial layout
      editor.layout();
    };

    useImperativeHandle(ref, () => ({
      layout: rafLayout,
      focus: () => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      },
    }));

    const handleChange = (value: string | undefined) => {
      if (!onChange) return;

      const stringValue = value || '';

      if (isStringValue) {
        onChange(stringValue);
        return;
      }

      if (sourceCodeObject) {
        const updatedSourceCode = {
          ...sourceCodeObject,
          [activeTab]: stringValue,
        };
        onChange(updatedSourceCode);
      } else {
        onChange(stringValue);
      }
    };

    const handlePlaceholderClick = () => {
      setShowPlaceholder(false);
      if (editorRef.current) {
        setTimeout(() => {
          if (editorRef.current) {
            rafLayout();
            editorRef.current.focus();
          }
        }, 0);
      }
    };

    return (
      <div
        ref={containerRef}
        className={cn('h-full w-full flex flex-col gap-2', containerClassName)}
      >
        {shouldShowTabs && (
          <div className="flex justify-start gap-4 items-center" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'code'}
              className={cn(
                'text-sm cursor-pointer bg-transparent border-none p-0 hover:opacity-75',
                {
                  'font-bold': activeTab === 'code',
                },
              )}
              onClick={() => handleTabClick('code')}
            >
              {t('Code')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'packageJson'}
              className={cn(
                'text-sm cursor-pointer bg-transparent border-none p-0 hover:opacity-75',
                {
                  'font-bold': activeTab === 'packageJson',
                },
              )}
              onClick={() => handleTabClick('packageJson')}
            >
              {t('Dependencies')}
            </button>
          </div>
        )}
        <div className={cn('border-t relative flex-1', className)}>
          {showPlaceholder && (
            <button
              type="button"
              className={cn(
                'absolute inset-0 z-10 flex items-center px-3 text-muted-foreground cursor-text',
                'bg-background border border-input rounded-md',
                'text-left',
              )}
              onClick={handlePlaceholderClick}
              aria-label={t('Click to start editing')}
            >
              {placeholder}
            </button>
          )}
          <div
            ref={editorWrapperRef}
            className={cn('w-full h-full', {
              'opacity-0': showPlaceholder,
            })}
          >
            <Editor
              className="min-h-10"
              value={formatValue(currentValue)}
              language={currentLanguage}
              theme={editorTheme}
              width="100%"
              height="100%"
              onChange={handleChange}
              onMount={handleEditorDidMount}
              options={{
                contextmenu: false,
                readOnly: isReadOnly,
                stickyScroll: {
                  enabled: false,
                },
                scrollBeyondLastLine: false,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  alwaysConsumeMouseWheel: false,
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                wordWrap: 'on',
                lineNumbers: showLineNumbers ? 'on' : 'off',
                minimap: { enabled: false },
                automaticLayout: false,
                tabSize: 2,
                insertSpaces: true,
                formatOnPaste: false,
                formatOnType: false,
                folding: isReadOnly,
                renderLineHighlight: isReadOnly ? 'none' : 'line',
                cursorBlinking: isReadOnly ? 'solid' : 'blink',
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                find: {
                  autoFindInSelection: 'never',
                  seedSearchStringFromSelection: 'never',
                },
                fixedOverflowWidgets: true,
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);

CodeEditor.displayName = 'CodeEditor';
export { CodeEditor };
