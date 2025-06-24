import { json } from '@codemirror/lang-json';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, {
  EditorState,
  EditorView,
  ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import React, { RefObject, useRef } from 'react';
import { cn } from '../../lib/cn';

const styleTheme = EditorView.baseTheme({
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
});

const convertToString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
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
      <div
        className={cn('flex flex-col gap-2 border rounded', containerClassName)}
      >
        <CodeMirror
          ref={ref}
          value={convertToString(value)}
          placeholder={placeholder}
          className={cn('border-none', className)}
          height="250px"
          width="100%"
          maxWidth="100%"
          basicSetup={{
            foldGutter: false,
            lineNumbers: true,
            searchKeymap: false,
            lintKeymap: true,
            autocompletion: true,
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
