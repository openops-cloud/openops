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
    <div className="h-auto">
      <CodeEditor
        value={content}
        readonly={true}
        showLineNumbers={false}
        className="border border-solid rounded"
        theme={theme}
        language={getLanguageExtensionForCode(className)}
        showTabs={typeof content !== 'string' && 'packageJson' in content}
      />
    </div>
  );
};

MarkdownCodeViewer.displayName = 'MarkdownCodeViewer';
export { MarkdownCodeViewer };
