import { TextContentPart, ToolCallMessagePartProps } from '@assistant-ui/react';
import { t } from 'i18next';
import { useMemo } from 'react';
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

  const parsedResult = useMemo((): CodeResult | undefined => {
    if (!result) {
      return;
    }
    if ('code' in result) {
      if (!result.code) {
        return;
      }
      return result;
    }

    return !result.isError
      ? (tryParseJson(result.content?.[0]?.text) as CodeResult)
      : {
          code: t('Something went wrong'),
          packageJson: '',
        };
  }, [result]);

  if (status.type !== 'complete') {
    return (
      <Skeleton className="w-full h-[150px]">
        <div className="flex items-center justify-center h-full">
          {t('Generating ...')}
        </div>
      </Skeleton>
    );
  }

  if (!parsedResult) {
    return null;
  }

  return (
    <div className="relative flex flex-col px-3 w-full h-[300px] overflow-hidden">
      <CodeEditor
        value={parsedResult}
        readonly={true}
        showLineNumbers={false}
        className="border border-solid rounded"
        theme={theme}
        showTabs={true}
        language={getLanguageExtensionForCode('language-typescript')}
      />
      <CodeActions
        content={parsedResult}
        onInject={handleInject}
        injectButtonText={t('Use code')}
      />
    </div>
  );
};

GenerateCodeTool.displayName = 'GenerateCodeTool';
export { GenerateCodeTool };
