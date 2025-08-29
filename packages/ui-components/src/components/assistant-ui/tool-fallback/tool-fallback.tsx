import {
  MessagePartStatus,
  ToolCallMessagePartProps,
  ToolCallMessagePartStatus,
} from '@assistant-ui/react';
import { useMemo } from 'react';
import { tryParseJson } from '../../../lib/json-utils';
import { Theme } from '../../../lib/theme';
import { TestStepDataViewer } from '../../test-step-data-viewer/test-step-data-viewer';
import { TOOL_STATUS_TYPES } from '../tool-status';
import { BaseToolWrapper } from './base-tool-wrapper';
import {
  formatToolResultForDisplay,
  hasContentError,
  hasDirectError,
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

  const formattedArgs = useMemo(() => tryParseJson(argsText), [argsText]);
  const formattedResult = useMemo(
    () => formatToolResultForDisplay(result),
    [result],
  );

  return (
    <BaseToolWrapper toolName={toolName} status={resultStatus}>
      <div className="flex flex-col gap-4 h-72">
        <TestStepDataViewer
          inputJson={formattedArgs}
          outputJson={formattedResult}
          readonly={true}
          theme={theme}
          editorClassName="h-full"
          containerClassName="border-none"
        />
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

  if (result && typeof result === 'object') {
    if (hasDirectError(result) || hasContentError(result)) {
      return {
        type: TOOL_STATUS_TYPES.INCOMPLETE,
        reason: 'error',
      };
    }
  }

  return status;
};
