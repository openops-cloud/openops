import { RunWorkflowManuallyDialog } from '@/app/features/flows/components/run-workflow-manually-dialog';
import { useRunWorkflowManually } from '@/app/features/flows/lib/run-workflow-manually-hook';
import { DropdownMenuItem, TooltipWrapper } from '@openops/components/ui';
import { FlowVersion } from '@openops/shared';
import { t } from 'i18next';
import { CirclePlay } from 'lucide-react';
import React from 'react';

type MenuItemTriggerProps = {
  disabled?: boolean;
  onSelect?: () => void;
};

const MenuItemTrigger = React.forwardRef<HTMLDivElement, MenuItemTriggerProps>(
  ({ disabled, onSelect }, ref) => {
    return (
      <div ref={ref}>
        <div className="border-t h-0 w-full my-1"></div>

        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onSelect?.();
          }}
          disabled={disabled}
        >
          <div className="flex cursor-pointer flex-row gap-2 items-center">
            <CirclePlay className="h-4 w-4" />
            <span>{t('Run Workflow')}</span>
          </div>
        </DropdownMenuItem>
      </div>
    );
  },
);

MenuItemTrigger.displayName = 'MenuItemTrigger';

type RunWorkflowManuallyMenuItemProps = {
  flowVersion: FlowVersion;
  isPublished: boolean;
};

const RunWorkflowManuallyMenuItem = ({
  flowVersion,
  isPublished,
}: RunWorkflowManuallyMenuItemProps) => {
  const { isOpen, setIsOpen, canRun, isPollingType, run, isPending } =
    useRunWorkflowManually({ flowVersion, isPublished });

  if (!canRun) {
    return (
      <TooltipWrapper
        tooltipText={t(
          'This workflow is event-driven and cannot be triggered manually',
        )}
      >
        <MenuItemTrigger disabled={true} />
      </TooltipWrapper>
    );
  }

  if (isPollingType) {
    return <MenuItemTrigger onSelect={() => run({})} />;
  }

  return (
    <RunWorkflowManuallyDialog
      onRun={run}
      isRunPending={isPending}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <MenuItemTrigger onSelect={() => setIsOpen(true)} />
    </RunWorkflowManuallyDialog>
  );
};

RunWorkflowManuallyMenuItem.displayName = 'RunWorkflowManuallyMenuItem';
export { RunWorkflowManuallyMenuItem };
