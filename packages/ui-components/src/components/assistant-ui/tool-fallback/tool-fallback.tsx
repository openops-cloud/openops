import {
  MessagePartStatus,
  ToolCallContentPartComponent,
  ToolCallMessagePartStatus,
} from '@assistant-ui/react';
import { TOOL_STATUS_TYPES } from '../tool-status';
import { BaseToolWrapper } from './base-tool-wrapper';

export const ToolFallback: ToolCallContentPartComponent = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  const resultStatus = extractResultStatus(result, status);

  return (
    <BaseToolWrapper toolName={toolName} status={resultStatus}>
      <div className="flex flex-col gap-2 border-t border-border pt-2">
        <div className="px-4">
          <pre className="whitespace-pre-wrap text-foreground">{argsText}</pre>
        </div>
        {result !== undefined && (
          <div className="border-t border-dashed border-border px-4 pt-2">
            <p className="font-semibold text-foreground">Result:</p>
            <pre className="whitespace-pre-wrap text-foreground">
              {typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2)}
            </pre>
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
