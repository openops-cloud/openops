import {
  MessagePartStatus,
  ToolCallMessagePartProps,
  ToolCallMessagePartStatus,
} from '@assistant-ui/react';
import { t } from 'i18next';
import { tryParseJson } from '../../../lib/json-utils';
import { Theme } from '../../../lib/theme';
import { CodeEditor } from '../../code-editor';
import { TOOL_STATUS_TYPES } from '../tool-status';
import { BaseToolWrapper } from './base-tool-wrapper';
import {
  calculateEditorHeight,
  formatToolResultForDisplay,
} from './tool-json-parser';

type ToolFallbackProps = ToolCallMessagePartProps & {
  theme: Theme;
};

export const ToolFallback = ({
  toolName,
  argsText,
  result,
  status,
  theme,
}: ToolFallbackProps) => {
  const resultStatus = extractResultStatus(result, status);

  const formattedArgs = tryParseJson(argsText);
  const formattedResult = formatToolResultForDisplay(result);
  const argsHeight = calculateEditorHeight(
    typeof formattedArgs === 'string'
      ? formattedArgs
      : JSON.stringify(formattedArgs, null, 2),
    60,
    200,
  );
  const resultHeight = calculateEditorHeight(formattedResult, 80, 250);

  return (
    <BaseToolWrapper toolName={toolName} status={resultStatus}>
      <div className="flex flex-col gap-1 pt-2">
        <div className="px-4">
          <p className="font-semibold text-foreground mb-2">{t('Input:')}</p>
          <div style={{ height: `${argsHeight}px` }}>
            <CodeEditor
              value={formattedArgs}
              readonly={true}
              theme={theme}
              language="json"
              showLineNumbers={true}
              containerClassName="h-full"
              className="border-t border-solid rounded"
            />
          </div>
        </div>
        {result !== undefined && (
          <div className="px-4 pt-2">
            <p className="font-semibold text-foreground mb-2">{t('Output:')}</p>
            <div style={{ height: `${resultHeight}px` }}>
              <CodeEditor
                value={formattedResult}
                readonly={true}
                theme={theme}
                language="json"
                showLineNumbers={true}
                containerClassName="h-full"
                className="border-t border-solid rounded"
              />
            </div>
          </div>
        )}
      </div>
    </BaseToolWrapper>
  );
};

const extractResultStatus = (
  result: unknown,
  status: MessagePartStatus | ToolCallMessagePartStatus,
): MessagePartStatus | ToolCallMessagePartStatus => {
  if (typeof result === 'string') {
    return status;
  }

  if (
    result &&
    typeof result === 'object' &&
    'isError' in result &&
    result.isError
  ) {
    const errorStatus: MessagePartStatus = {
      type: TOOL_STATUS_TYPES.INCOMPLETE,
      reason: 'error',
    };
    return errorStatus;
  }

  return status;
};
