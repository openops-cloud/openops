import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { triggerEventsApi } from '@/app/features/flows/lib/trigger-events-api';
import { TriggerStrategy } from '@openops/blocks-framework';
import { FlowVersion, TriggerType } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

export const useRunWorkflowManually = ({
  flowVersion,
  isPublished,
}: {
  flowVersion: FlowVersion;
  isPublished: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { blockName, blockVersion, triggerName } = flowVersion.trigger.settings;

  const isBlockTrigger = useMemo(() => {
    return flowVersion.trigger.type === TriggerType.BLOCK;
  }, [flowVersion.trigger.type]);

  const { blockModel } = blocksHooks.useBlock({
    name: blockName,
    version: blockVersion,
    enabled: !!blockName && isBlockTrigger,
  });

  const { isPollingType, isWebhookType } = useMemo(() => {
    return {
      isWebhookType:
        blockModel?.triggers[triggerName].type === TriggerStrategy.WEBHOOK,
      isPollingType:
        blockModel?.triggers[triggerName].type === TriggerStrategy.POLLING,
    };
  }, [blockModel?.triggers, triggerName]);

  const onSuccess = useCallback(() => {
    setIsOpen(false);
    //todo add toast
  }, [setIsOpen]);

  const { mutate: runWebhookTrigger, isPending } = useMutation({
    mutationFn: async (queryParams: Record<string, string>) => {
      return await triggerEventsApi.triggerWebhook(
        flowVersion.flowId,
        queryParams,
      );
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const canRun =
    isPublished &&
    flowVersion?.valid &&
    (isPollingType || isWebhookType) &&
    isBlockTrigger;

  return {
    isOpen,
    setIsOpen,
    canRun,
    isPending,
    isPollingType,
    runWebhookTrigger,
  };
};
