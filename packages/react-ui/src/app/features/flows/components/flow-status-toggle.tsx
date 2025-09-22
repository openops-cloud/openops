import {
  INTERNAL_ERROR_TOAST,
  LoadingSpinner,
  Switch,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openops/components/ui';
import {
  Flow,
  FlowOperationType,
  FlowStatus,
  FlowVersion,
  isNil,
  Permission,
  PopulatedFlow,
} from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { flowsApi } from '../lib/flows-api';
import { flowsUtils } from '../lib/flows-utils';

import { ExecuteRiskyFlowConfirmationMessages } from './execute-risky-flow-dialog/execute-risky-flow-confirmation-message';
import {
  ExecuteRiskyFlowDialog,
  useExecuteRiskyFlowDialog,
} from './execute-risky-flow-dialog/execute-risky-flow-dialog';

import { useAuthorization } from '@/app/common/hooks/authorization-hooks';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { t } from 'i18next';
import { getShortTriggerExplanation } from '../lib/flow-status-toggle-utils';

type FlowStatusToggleProps = {
  flow: Flow;
  flowVersion: FlowVersion;
  onFlowStatusChange?: (status: FlowStatus) => void;
};

const FlowStatusToggle = ({
  flow,
  flowVersion,
  onFlowStatusChange,
}: FlowStatusToggleProps) => {
  const [isFlowPublished, setIsChecked] = useState(
    flow.status === FlowStatus.ENABLED,
  );
  const { checkAccess } = useAuthorization();
  const userHasPermissionToToggleFlowStatus = checkAccess(
    Permission.UPDATE_FLOW_STATUS,
  );

  useEffect(() => {
    setIsChecked(flow.status === FlowStatus.ENABLED);
  }, [flow.status]);

  const { mutate, isPending: isLoading } = useMutation<
    PopulatedFlow,
    Error,
    void
  >({
    mutationFn: async (): Promise<PopulatedFlow> => {
      return flowsApi.applyOperation(flow.id, {
        type: FlowOperationType.CHANGE_STATUS,
        request: {
          status: isFlowPublished ? FlowStatus.DISABLED : FlowStatus.ENABLED,
        },
      });
    },
    onSuccess: (flow) => {
      setIsChecked(flow.status === FlowStatus.ENABLED);
      onFlowStatusChange?.(flow.status);
    },
    onError: () => {
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  const { stepMetadata: triggerMetadata } = blocksHooks.useStepMetadata({
    step: flowVersion.trigger,
  });

  const {
    isDialogOpen,
    riskyStepNames,
    isLoading: isFlowMetadataLoading,
    handleExecuting,
    handleExecutingConfirm,
    handleExecutingCancel,
    setIsDialogOpen,
  } = useExecuteRiskyFlowDialog(flowVersion, mutate);

  const changeStatus = (isChecked: boolean) => {
    if (isChecked) {
      handleExecuting();
    } else {
      mutate();
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            <Switch
              checked={isFlowPublished}
              onCheckedChange={(isChecked) => changeStatus(isChecked)}
              disabled={
                isLoading ||
                !userHasPermissionToToggleFlowStatus ||
                isNil(flow.publishedVersionId) ||
                isFlowMetadataLoading
              }
            />

            <ExecuteRiskyFlowDialog
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              riskyStepNames={riskyStepNames}
              message={ExecuteRiskyFlowConfirmationMessages.GENERAL}
              onConfirm={handleExecutingConfirm}
              onCancel={handleExecutingCancel}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {userHasPermissionToToggleFlowStatus
            ? isNil(flow.publishedVersionId)
              ? t('Please publish workflow first')
              : isFlowPublished
              ? getShortTriggerExplanation(
                  flowVersion.trigger,
                  triggerMetadata,
                  flow,
                )
              : t('Workflow is off. It only runs if manually triggered.')
            : t('Permission Needed')}
        </TooltipContent>
      </Tooltip>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        isFlowPublished && (
          <Tooltip>
            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
              <div className="p-2 rounded-full ">
                {flowsUtils.flowStatusIconRenderer(flow, flowVersion)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {flowsUtils.flowStatusToolTipRenderer(flow, flowVersion)}
            </TooltipContent>
          </Tooltip>
        )
      )}
    </>
  );
};

FlowStatusToggle.displayName = 'FlowStatusToggle';
export { FlowStatusToggle };
