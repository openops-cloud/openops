import { ToolCallContentPartComponent } from '@assistant-ui/react';
import { BaseToolWrapper } from './base-tool-wrapper';

export const ToolFallback: ToolCallContentPartComponent = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  return (
    <BaseToolWrapper toolName={toolName} status={status}>
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
