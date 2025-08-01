import { Theme } from '@/lib/theme';
import { ToolCallMessagePartProps } from '@assistant-ui/react';
import { t } from 'i18next';
import {
  CodeEditor,
  getLanguageExtensionForCode,
} from '../../../components/code-editor';
import { CodeActions } from '../../code-actions';
import { useThreadExtraContext } from '../thread-extra-context';
import { BaseToolWrapper } from '../tool-fallback';

type GenerateCodeToolProps = ToolCallMessagePartProps & {
  theme: Theme;
  result: {
    code: string;
    packageJson: string;
  };
};

const GenerateCodeTool = ({
  toolName,
  result,
  status,
  theme,
}: GenerateCodeToolProps) => {
  const { handleInject } = useThreadExtraContext();

  return (
    <BaseToolWrapper
      toolName={toolName}
      status={status}
      collapsedByDefault={false}
    >
      <div className="relative px-3 w-full h-[300px] pb-10 overflow-hidden">
        <CodeEditor
          value={result}
          readonly={true}
          showLineNumbers={false}
          className="border border-solid rounded"
          theme={theme}
          showTabs={true}
          language={getLanguageExtensionForCode('typescript')}
        />
        <CodeActions
          content={result}
          onInject={handleInject}
          injectButtonText={t('Use code')}
        />
      </div>
    </BaseToolWrapper>
  );
};

GenerateCodeTool.displayName = 'GenerateCodeTool';
export { GenerateCodeTool };
