import { ToolCallMessagePartProps } from '@assistant-ui/react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../ui/button';
import { toolStatusUtils } from '../tool-status';

type BaseToolWrapperProps = {
  collapsedByDefault?: boolean;
  children?: React.ReactNode;
} & Pick<ToolCallMessagePartProps, 'toolName' | 'status'>;

const BaseToolWrapper = ({
  toolName,
  status,
  children,
  collapsedByDefault = true,
}: BaseToolWrapperProps) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsedByDefault);

  const isRunning = toolStatusUtils.isRunning(status);
  const isIncomplete = toolStatusUtils.isIncomplete(status);
  const isComplete = toolStatusUtils.isComplete(status);
  const isCancelled = toolStatusUtils.isCancelled(status);

  return (
    <div className="my-4 flex w-full flex-col rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2 px-4">
        {isComplete && (
          <CircleCheck className="size-4 text-success flex-shrink-0" />
        )}
        {(isIncomplete || isCancelled) && (
          <XCircle className="size-4 text-destructive flex-shrink-0" />
        )}
        <p className="text-foreground overflow-hidden text-ellipsis whitespace-nowrap flex-grow min-w-0">
          <b className="text-foreground">{toolName}</b>
        </p>
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="collapsible-content"
          size="icon"
          variant="ghost"
          className="size-8 p-2 flex-shrink-0 my-1"
          loading={isRunning}
        >
          {isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </Button>
      </div>
      {!isCollapsed && <div className="overflow-hidden">{children}</div>}
    </div>
  );
};

BaseToolWrapper.displayName = 'BaseToolWrapper';
export { BaseToolWrapper };
