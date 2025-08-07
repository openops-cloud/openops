import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { RunWorkflowManuallyDialog } from '@/app/features/flows/components/run-workflow-manually-dialog';
import { triggerEventsApi } from '@/app/features/flows/lib/trigger-events-api';
import { TriggerStrategy } from '@openops/blocks-framework';
import { DropdownMenuItem, TooltipWrapper } from '@openops/components/ui';
import { FlowVersion, TriggerType } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { CirclePlay } from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
          <div className="flex cursor-pointer  flex-row gap-2 items-center ">
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
  const [isOpen, setIsOpen] = useState(false);

  const { blockName, blockVersion, triggerName } = flowVersion.trigger.settings;

  const isBlockTrigger = useMemo(() => {
    return flowVersion.trigger.type === TriggerType.BLOCK;
  }, [flowVersion?.trigger?.type]);

  const { blockModel } = blocksHooks.useBlock({
    name: blockName,
    version: blockVersion,
    enabled: !!blockName && isBlockTrigger,
  });

  const isWebhookType = useMemo(() => {
    return blockModel?.triggers[triggerName].type === TriggerStrategy.WEBHOOK;
  }, [blockModel?.triggers, triggerName]);

  const isPollingType = useMemo(() => {
    return blockModel?.triggers[triggerName].type === TriggerStrategy.POLLING;
  }, [blockModel?.triggers, triggerName]);

  const { mutate: runWebhookTrigger, isPending } = useMutation({
    mutationFn: async (queryParams: Record<string, string>) => {
      return await triggerEventsApi.triggerWebhook(
        flowVersion.flowId,
        queryParams,
      );
    },
    onSuccess: () => {
      setIsOpen(false);
    },
  });

  if (
    !isPublished ||
    !flowVersion?.valid ||
    (!isPollingType && !isWebhookType) ||
    !isBlockTrigger
  ) {
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
    return (
      <MenuItemTrigger
        onSelect={() => {
          // Handle polling type trigger
        }}
      />
    );
  }

  return (
    <RunWorkflowManuallyDialog
      onRun={runWebhookTrigger}
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
