import Editor from '@monaco-editor/react';
import { SourceCode } from '@openops/shared';
import { t } from 'i18next';
import React, {
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../../lib/cn';
import { convertToString, isSourceCodeObject } from './code-utils';

const calculateLineHeight = (editor: any, monaco: any): number => {
  try {
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    if (lineHeight && lineHeight > 0) {
      return lineHeight;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  try {
    const fontSize =
      editor.getOption(monaco.editor.EditorOption.fontSize) || 14;
    return Math.round(fontSize * 1.4);
  } catch (error) {
    return 20;
  }
};

export type MonacoLanguage =
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'kotlin'
  | 'swift'
  | 'php'
  | 'ruby'
  | 'perl'
  | 'sql'
  | 'yaml'
  | 'xml'
  | 'markdown'
  | 'dockerfile'
  | 'shell'
  | 'powershell'
  | 'bat'
  | 'ini'
  | 'plaintext';

type CodeEditorProps = {
  value: unknown;
  readonly?: boolean;
  onFocus?: (ref: RefObject<any>) => void;
  onChange?: (value: string | SourceCode) => void;
  className?: string;
  containerClassName?: string;
  theme: string;
  placeholder?: string;
  height?: string;
  showLineNumbers?: boolean;
  minHeight?: number;
  maxHeight?: number;
  autoHeight?: boolean;
  language?: MonacoLanguage;
  showTabs?: boolean;
};

const CodeEditor = React.memo(
  ({
    value,
    readonly = false,
    onFocus,
    onChange,
    className,
    containerClassName,
    theme,
    placeholder,
    height = '200px',
    showLineNumbers = true,
    minHeight = 100,
    maxHeight = 500,
    autoHeight = true,
    language = 'json',
    showTabs = false,
  }: CodeEditorProps) => {
    const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';
    const ref = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [calculatedHeight, setCalculatedHeight] = useState<string>(height);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [monacoInstance, setMonacoInstance] = useState<any>(null);
    const [showPlaceholder, setShowPlaceholder] = useState(false);
    const [hasTextFocus, setHasTextFocus] = useState(false);

    // Tab-related state
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

    const currentValue = activeTab === 'code' ? code : packageJson;
    const isReadOnly = readonly || activeTab === 'packageJson';
    const hasContent = currentValue && String(currentValue).trim() !== '';

    // Update placeholder visibility based on content and focus state
    useEffect(() => {
      if (placeholder && !hasContent && !hasTextFocus && !isReadOnly) {
        setShowPlaceholder(true);
      } else {
        setShowPlaceholder(false);
      }
    }, [placeholder, hasContent, hasTextFocus, isReadOnly]);

    const handleTabClick = (tab: keyof SourceCode) => {
      setActiveTab(tab);
      setCurrentLanguage(tab === 'packageJson' ? 'json' : 'typescript');
    };

    const calculateContentHeight = useCallback(() => {
      if (!autoHeight || !isEditorReady || !ref.current || !monacoInstance)
        return;

      const editor = ref.current;
      const model = editor.getModel();

      if (model) {
        const lineCount = model.getLineCount();
        const lineHeight = calculateLineHeight(editor, monacoInstance);
        const contentHeight = lineCount * lineHeight;

        const padding = 20;
        const finalHeight = Math.max(
          minHeight,
          Math.min(maxHeight, contentHeight + padding),
        );

        setCalculatedHeight(`${finalHeight}px`);

        setTimeout(() => {
          editor.layout();
        }, 0);
      }
    }, [autoHeight, isEditorReady, minHeight, maxHeight, monacoInstance]);

    useEffect(() => {
      calculateContentHeight();
    }, [calculateContentHeight]);

    useEffect(() => {
      if (!containerRef.current || !isEditorReady) return;

      const resizeObserver = new ResizeObserver(() => {
        if (ref.current) {
          ref.current.layout();
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, [isEditorReady]);

    const handleEditorDidMount = (editor: any, monaco: any) => {
      ref.current = editor;
      setMonacoInstance(monaco);
      setIsEditorReady(true);

      editor.onDidFocusEditorText(() => {
        setHasTextFocus(true);
        onFocus?.(ref);
      });

      editor.onDidBlurEditorWidget(() => {
        setHasTextFocus(false);
      });

      if (autoHeight) {
        editor.onDidChangeModelContent(() => {
          const model = editor.getModel();
          if (model) {
            const lineCount = model.getLineCount();
            const lineHeight = calculateLineHeight(editor, monaco);
            const contentHeight = lineCount * lineHeight;
            const padding = 20;
            const finalHeight = Math.max(
              minHeight,
              Math.min(maxHeight, contentHeight + padding),
            );

            setCalculatedHeight(`${finalHeight}px`);

            // Trigger layout after height change
            setTimeout(() => {
              editor.layout();
            }, 0);
          }
        });
      }
    };

    const handleChange = (value: string | undefined) => {
      if (!onChange) return;

      const stringValue = value || '';

      // If input was a string, emit a string
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
      if (ref.current) {
        setTimeout(() => {
          ref.current.layout();
          ref.current.focus();
        }, 0);
      }
    };

    const effectiveHeight = autoHeight ? calculatedHeight : height;

    return (
      <div
        ref={containerRef}
        className={cn('h-full flex flex-col gap-2', containerClassName)}
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
        <div className={cn('border-t relative', className)}>
          {showPlaceholder && (
            <div
              className={cn(
                'absolute inset-0 z-10 flex items-center px-3 text-muted-foreground cursor-text',
                'bg-background border border-input rounded-md',
              )}
              onClick={handlePlaceholderClick}
            >
              {placeholder}
            </div>
          )}
          <div className={cn({ 'opacity-0': showPlaceholder })}>
            <Editor
              value={formatValue(currentValue)}
              language={currentLanguage}
              theme={editorTheme}
              height={effectiveHeight}
              width="100%"
              onChange={handleChange}
              onMount={handleEditorDidMount}
              options={{
                readOnly: isReadOnly,
                stickyScroll: {
                  enabled: false,
                },
                scrollBeyondLastColumn: 0,
                wordWrap: 'on',
                lineNumbers: showLineNumbers ? 'on' : 'off',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true,
                folding: isReadOnly,
                renderLineHighlight: isReadOnly ? 'none' : 'line',
                cursorBlinking: isReadOnly ? 'solid' : 'blink',
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                find: {
                  autoFindInSelection: 'never',
                  seedSearchStringFromSelection: 'never',
                },
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
