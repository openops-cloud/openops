import { ToolCallMessagePartProps } from '@assistant-ui/react';
import { t } from 'i18next';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheck,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../ui/button';

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
      {!isCollapsed && children}
    </div>
  );
};
BaseToolWrapper.displayName = 'BaseToolWrapper';
export { BaseToolWrapper };
