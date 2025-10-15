import { Theme } from '../../lib/theme';
import { CodeEditor, getLanguageExtensionForCode } from '../code-editor';
import { parseCodeBlockMetadata } from './markdown-metadata-parser';

const MarkdownCodeViewer = ({
  content,
  theme,
  className,
}: {
  content: string;
  theme: Theme;
  className?: string;
}) => {
  const metadata = parseCodeBlockMetadata(className);

  return (
    <div className="h-auto">
      <CodeEditor
        value={content}
        readonly={true}
        showLineNumbers={false}
        className="border border-solid rounded"
        height={metadata.height}
        theme={theme}
        language={getLanguageExtensionForCode(className)}
        showTabs={typeof content !== 'string' && 'packageJson' in content}
      />
    </div>
  );
};

MarkdownCodeViewer.displayName = 'MarkdownCodeViewer';
export { MarkdownCodeViewer };
