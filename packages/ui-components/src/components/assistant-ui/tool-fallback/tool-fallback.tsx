import { ToolCallContentPartComponent } from '@assistant-ui/react';
import { t } from 'i18next';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../ui/button';

export const ToolFallback: ToolCallContentPartComponent = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const isRunning = status?.type === 'running';
  const isIncomplete = status?.type === 'incomplete';
  const isComplete = status?.type === 'complete';

  return (
    <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border border-border bg-background py-3">
      <div className="flex items-center gap-2 px-4">
        {isComplete && <CircleCheck className="size-4 text-success" />}
        {isIncomplete && <XCircle className="size-4 text-foreground" />}
        <p className="text-foreground">
          {isComplete && t('Used tool: ')}
          {isRunning && t('Using tool: ')}
          {isIncomplete && t('Incomplete tool call: ')}
          <b className="text-foreground">{toolName}</b>
        </p>
        <div className="flex-grow" />
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="collapsible-content"
          size="icon"
          variant="default"
          className={'size-8 p-2 text-white'}
          loading={isRunning}
        >
          {isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          <div className="px-4">
            <pre className="whitespace-pre-wrap text-foreground">
              {argsText}
            </pre>
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
      )}
    </div>
  );
};
