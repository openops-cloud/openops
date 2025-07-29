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
  const lines = content.split('\n').length ?? 1;
  const calculatedHeight = Math.max(300, lines * 18);

  return (
    <CodeEditor
      value={content}
      readonly={true}
      showLineNumbers={false}
      className="border border-solid rounded"
      theme={theme}
      language={getLanguageExtensionForCode(className)}
      showTabs={typeof content !== 'string' && 'packageJson' in content}
      height={`${calculatedHeight}px`}
    />
  );
};

MarkdownCodeViewer.displayName = 'MarkdownCodeViewer';
export { MarkdownCodeViewer };
