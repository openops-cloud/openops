import { Theme } from '@/lib/theme';
import { ToolCallMessagePartProps } from '@assistant-ui/react/src/types/MessagePartComponentTypes';
import { t } from 'i18next';
import { useMemo } from 'react';
import { CodeActions } from '../../code-actions';
import {
  CodeMirrorEditor,
  getLanguageExtensionForCode,
} from '../../json-editor';
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

  const codeContent = useMemo(
    () =>
      JSON.stringify({
        code: result.code,
        packageJson: result.packageJson,
      }),
    [result],
  );

  return (
    <BaseToolWrapper toolName={toolName} status={status}>
      <div className="relative px-3 w-full">
        <CodeMirrorEditor
          value={result}
          readonly={true}
          showLineNumbers={false}
          height="auto"
          className="border border-solid rounded"
          containerClassName="h-auto"
          theme={theme}
          showTabs={true}
          languageExtensions={getLanguageExtensionForCode('typescript')}
          editorLanguage="typescript"
        />
        <CodeActions
          content={codeContent}
          onInject={handleInject}
          injectButtonText={t('Use code')}
        />
      </div>
    </BaseToolWrapper>
  );
};

GenerateCodeTool.displayName = 'GenerateCodeTool';
export { GenerateCodeTool };
