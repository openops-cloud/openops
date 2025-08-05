import { ToolCallMessagePartProps } from '@assistant-ui/react';
import { t } from 'i18next';
import {
  CodeEditor,
  getLanguageExtensionForCode,
} from '../../../components/code-editor';
import { Theme } from '../../../lib/theme';
import { Skeleton } from '../../../ui/skeleton';
import { CodeActions } from '../../code-actions';
import { useThreadExtraContext } from '../thread-extra-context';

type GenerateCodeToolProps = ToolCallMessagePartProps & {
  theme: Theme;
  result: {
    code: string;
    packageJson: string;
  };
};

const GenerateCodeTool = ({ result, status, theme }: GenerateCodeToolProps) => {
  const { handleInject } = useThreadExtraContext();

  if (status.type !== 'complete') {
    return (
      <Skeleton className="w-full h-[150px]">
        <div className="flex items-center justify-center h-full">
          {t('Generating...')}
        </div>
      </Skeleton>
    );
  }

  return (
    <div className="relative flex flex-col px-3 w-full h-[300px] overflow-hidden">
      <CodeEditor
        value={result}
        readonly={true}
        showLineNumbers={false}
        className="border border-solid rounded"
        theme={theme}
        showTabs={true}
        language={getLanguageExtensionForCode('language-typescript')}
      />
      <CodeActions
        content={result}
        onInject={handleInject}
        injectButtonText={t('Use code')}
      />
    </div>
  );
};

GenerateCodeTool.displayName = 'GenerateCodeTool';
export { GenerateCodeTool };
