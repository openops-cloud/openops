import { json } from '@codemirror/lang-json';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, {
  EditorState,
  EditorView,
  ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import React, { RefObject, useRef } from 'react';
import { cn } from '../../lib/cn';
import { ScrollArea } from '../../ui/scroll-area';

const styleTheme = EditorView.baseTheme({
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
});

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

type CodeMirrorEditorProps = {
  value: unknown;
  readonly?: boolean;
  onFocus?: (ref: RefObject<ReactCodeMirrorRef>) => void;
  onChange?: (value: string) => void;
  className?: string;
  containerClassName?: string;
  theme?: string;
  placeholder?: string;
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
  }: CodeMirrorEditorProps) => {
    const editorTheme = theme === 'dark' ? githubDark : githubLight;
    const extensions = [
      styleTheme,
      EditorState.readOnly.of(readonly),
      EditorView.editable.of(!readonly),
      json(),
    ];
    const ref = useRef<ReactCodeMirrorRef>(null);

    return (
      <div className={cn('h-full flex flex-col gap-2', containerClassName)}>
        <CodeMirror
          ref={ref}
          value={convertToString(value)}
          placeholder={placeholder}
          className={cn('border-t', className)}
          height="100%"
          width="100%"
          maxWidth="100%"
          basicSetup={{
            foldGutter: readonly,
            lineNumbers: true,
            searchKeymap: false,
            lintKeymap: true,
            autocompletion: true,
            highlightActiveLine: !readonly,
          }}
          lang="json"
          onChange={onChange}
          theme={editorTheme}
          readOnly={readonly}
          onFocus={() => onFocus?.(ref)}
          extensions={extensions}
        />
      </div>
    );
  },
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
export { CodeMirrorEditor };
