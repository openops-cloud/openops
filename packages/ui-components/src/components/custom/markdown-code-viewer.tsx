import { Theme } from '../../lib/theme';
import { CodeEditor, getLanguageExtensionForCode } from '../code-editor';

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
    <CodeEditor
      value={content}
      readonly={true}
      showLineNumbers={false}
      height="auto"
      className="border border-solid rounded"
      containerClassName="h-auto"
      theme={theme}
      language={getLanguageExtensionForCode(className)}
      showTabs={typeof content !== 'string' && 'packageJson' in content}
    />
  );
};

MarkdownCodeViewer.displayName = 'MarkdownCodeViewer';
export { MarkdownCodeViewer };
