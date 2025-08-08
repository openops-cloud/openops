import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { TriggerStrategy } from '@openops/blocks-framework';
import {
  getRunWorkflowManuallySuccessToast,
  INTERNAL_ERROR_TOAST,
  toast,
} from '@openops/components/ui';
import { FlowVersion, TriggerType } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

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

  const { mutate: run, isPending } = useMutation({
    mutationFn: async (queryParams?: Record<string, string>) => {
      return await flowsApi.runManually(flowVersion.flowId, queryParams);
    },
    onSuccess: (response) => {
      setIsOpen(false);
      toast(
        getRunWorkflowManuallySuccessToast(`runs/${response.flowRunId}`) as any,
      );
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
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
    run,
  };
};
