import { Theme } from '../../lib/theme';
import { CodeMirrorEditor, getLanguageExtensionForCode } from '../json-editor';
import { extractLanguageFromClassName } from './utils';

const MarkdownCodeViewer = ({
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

MarkdownCodeViewer.displayName = 'MarkdownCodeViewer';
export { MarkdownCodeViewer };
