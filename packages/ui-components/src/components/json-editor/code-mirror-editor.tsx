import Editor from '@monaco-editor/react';
import React, { RefObject, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

const convertToString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('circular structure')
    ) {
      const seen = new WeakSet();
      return JSON.stringify(
        value,
        (key, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '';
            }
            seen.add(val);
          }
          return val;
        },
        2,
      );
    }
    return String(value);
  }
};

// Helper function to calculate line height
const calculateLineHeight = (editor: any, monaco: any): number => {
  try {
    // Try to get line height from editor options
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    if (lineHeight && lineHeight > 0) {
      return lineHeight;
    }
  } catch (error) {
    // Fallback if editor options are not available
  }

  // Fallback: calculate based on font size
  try {
    const fontSize =
      editor.getOption(monaco.editor.EditorOption.fontSize) || 14;
    return Math.round(fontSize * 1.4); // Typical line height is 1.4x font size
  } catch (error) {
    // Final fallback
    return 20; // Default line height
  }
};

// Common Monaco Editor languages
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

type CodeMirrorEditorProps = {
  value: unknown;
  readonly?: boolean;
  onFocus?: (ref: RefObject<any>) => void;
  onChange?: (value: string) => void;
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
};

const CodeMirrorEditor = React.memo(
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
  }: CodeMirrorEditorProps) => {
    const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';
    const ref = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [calculatedHeight, setCalculatedHeight] = useState<string>(height);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [monacoInstance, setMonacoInstance] = useState<any>(null);

    // Format value based on language
    const formatValue = (value: unknown): string => {
      if (typeof value === 'string') {
        return value;
      }

      // For JSON-like languages, format as JSON
      if (['json', 'javascript', 'typescript'].includes(language)) {
        return convertToString(value);
      }

      // For other languages, convert to string
      return String(value);
    };

    // Calculate height based on content when autoHeight is enabled
    const calculateContentHeight = () => {
      if (!autoHeight || !isEditorReady || !ref.current || !monacoInstance)
        return;

      const editor = ref.current;
      const model = editor.getModel();

      if (model) {
        const lineCount = model.getLineCount();
        const lineHeight = calculateLineHeight(editor, monacoInstance);
        const contentHeight = lineCount * lineHeight;

        // Add padding for better appearance
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
    };

    // Update height when value changes
    useEffect(() => {
      calculateContentHeight();
    }, [
      value,
      autoHeight,
      isEditorReady,
      minHeight,
      maxHeight,
      monacoInstance,
    ]);

    // Handle container resize
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

      // Handle focus event
      editor.onDidFocusEditorText(() => {
        onFocus?.(ref);
      });

      // Handle content changes for auto height
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

      // Handle placeholder
      if (placeholder) {
        const updatePlaceholder = () => {
          const model = editor.getModel();
          if (model && model.getValue() === '') {
            editor.deltaDecorations(
              [],
              [
                {
                  range: new monaco.Range(1, 1, 1, 1),
                  options: {
                    afterContentClassName: 'editor-placeholder',
                    after: {
                      content: placeholder,
                      inlineClassName: 'editor-placeholder-inline',
                    },
                  },
                },
              ],
            );
          } else {
            editor.deltaDecorations([], []);
          }
        };

        updatePlaceholder();
        editor.onDidChangeModelContent(updatePlaceholder);
      }
    };

    const handleChange = (value: string | undefined) => {
      if (onChange) {
        onChange(value || '');
      }
    };

    const effectiveHeight = autoHeight ? calculatedHeight : height;

    return (
      <div
        ref={containerRef}
        className={cn('h-full flex flex-col gap-2', containerClassName)}
      >
        <div className={cn('border-t', className)}>
          <Editor
            value={formatValue(value)}
            language={language}
            theme={editorTheme}
            height={effectiveHeight}
            width="100%"
            onChange={handleChange}
            onMount={handleEditorDidMount}
            options={{
              readOnly: readonly,
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
              folding: readonly,
              renderLineHighlight: readonly ? 'none' : 'line',
              cursorBlinking: readonly ? 'solid' : 'blink',
              scrollbar: {
                // vertical: autoHeight ? 'hidden' : 'auto',
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
    );
  },
);

CodeMirrorEditor.displayName = 'MonacoEditor';
export { CodeMirrorEditor };
