import { TextContentPart, ToolCallMessagePartProps } from '@assistant-ui/react';
import { t } from 'i18next';
import {
  CodeEditor,
  getLanguageExtensionForCode,
} from '../../../components/code-editor';
import { tryParseJson } from '../../../lib/json-utils';
import { Theme } from '../../../lib/theme';
import { Skeleton } from '../../../ui/skeleton';
import { CodeActions } from '../../code-actions';
import { useThreadExtraContext } from '../thread-extra-context';

type CodeResult = {
  code: string;
  packageJson: string;
};

type GenerateCodeResult =
  | CodeResult
  // can be text content parts when loaded from history
  | {
      content: TextContentPart[];
      isError: boolean;
    };

type GenerateCodeToolProps = ToolCallMessagePartProps & {
  theme: Theme;
  result: GenerateCodeResult;
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
        value={parseResult(result)}
        readonly={true}
        showLineNumbers={false}
        className="border border-solid rounded"
        theme={theme}
        showTabs={true}
        language={getLanguageExtensionForCode('language-typescript')}
      />
      <CodeActions
        content={parseResult(result)}
        onInject={handleInject}
        injectButtonText={t('Use code')}
      />
    </div>
  );
};

const parseResult = (result: GenerateCodeResult): CodeResult => {
  if ('code' in result) {
    return result;
  }

  return !result.isError
    ? (tryParseJson(result.content[0].text) as CodeResult)
    : {
        code: 'Something error happened',
        packageJson: '',
      };
};

GenerateCodeTool.displayName = 'GenerateCodeTool';
export { GenerateCodeTool };
