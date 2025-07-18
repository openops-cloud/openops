import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { SourceCode } from '@openops/shared';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import CodeMirror, {
  EditorState,
  EditorView,
  Extension,
  ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { t } from 'i18next';
import React, { RefObject, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Theme } from '../../lib/theme';
import { convertToString, isSourceCodeObject } from './code-mirror-utils';

const styleTheme = EditorView.baseTheme({
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
});

type CodeMirrorEditorProps = {
  value: unknown;
  readonly?: boolean;
  onFocus?: (ref: RefObject<ReactCodeMirrorRef>) => void;
  onChange?: (value: unknown) => void;
  className?: string;
  containerClassName?: string;
  theme: Theme;
  placeholder?: string;
  languageExtensions?: Extension[];
  height?: string;
  showLineNumbers?: boolean;
  showTabs?: boolean;
  editorLanguage?: string;
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
    languageExtensions,
    height = '100%',
    showLineNumbers = true,
    showTabs = false,
    editorLanguage,
  }: CodeMirrorEditorProps) => {
    const editorTheme = theme === 'dark' ? githubDark : githubLight;

    const isStringValue = typeof value === 'string';
    const sourceCodeObject = isSourceCodeObject(value) ? value : null;
    const shouldShowTabs = showTabs && sourceCodeObject !== null;

    const { code, packageJson } = isStringValue
      ? { code: value, packageJson: undefined }
      : sourceCodeObject || { code: convertToString(value), packageJson: '{}' };

    const [activeTab, setActiveTab] = useState<keyof SourceCode>('code');
    const [language, setLanguage] = useState<string>(editorLanguage ?? 'json');

    const extensions = useMemo(
      () => [
        styleTheme,
        EditorState.readOnly.of(readonly || activeTab === 'packageJson'),
        EditorView.editable.of(!readonly && activeTab !== 'packageJson'),
        EditorView.lineWrapping,
        ...(languageExtensions || [
          language === 'json'
            ? json()
            : javascript({ jsx: false, typescript: true }),
        ]),
      ],
      [readonly, activeTab, language, languageExtensions],
    );

    const ref = useRef<ReactCodeMirrorRef>(null);

    const handleTabClick = (tab: keyof SourceCode) => {
      setActiveTab(tab);
      setLanguage(tab === 'packageJson' ? 'json' : 'typescript');
    };

    const handleEditorChange = (value: string) => {
      if (!onChange || typeof onChange !== 'function') return;

      // If input was a string, emit a string
      if (isStringValue) {
        onChange(value);
        return;
      }

      if (sourceCodeObject) {
        const updatedSourceCode = {
          ...sourceCodeObject,
          [activeTab]: value,
        };
        onChange(updatedSourceCode);
      } else {
        onChange(value);
      }
    };

    const currentValue = activeTab === 'code' ? code : packageJson;
    const isReadOnly = readonly || activeTab === 'packageJson';

    return (
      <div className={cn('h-full flex flex-col gap-2', containerClassName)}>
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
        <CodeMirror
          ref={ref}
          value={convertToString(currentValue)}
          placeholder={placeholder}
          className={cn('border-t', className)}
          height={height}
          width="100%"
          maxWidth="100%"
          basicSetup={{
            foldGutter: isReadOnly,
            highlightActiveLineGutter: !isReadOnly,
            highlightActiveLine: !isReadOnly,
            lineNumbers: showLineNumbers,
            searchKeymap: false,
            lintKeymap: true,
            autocompletion: true,
          }}
          indentWithTab={false}
          lang={language}
          onChange={handleEditorChange}
          theme={editorTheme}
          readOnly={isReadOnly}
          onFocus={() => onFocus?.(ref)}
          extensions={extensions}
        />
      </div>
    );
  },
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
export { CodeMirrorEditor };
