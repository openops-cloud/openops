import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openops/components/ui';
import { FlowVersionState } from '@openops/shared';
import { t } from 'i18next';
import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { SEARCH_PARAMS } from '@/app/constants/search-params';
import {
  LeftSideBarType,
  useBuilderStateContext,
  useSwitchToDraft,
} from '@/app/features/builder/builder-hooks';
import { ExecuteRiskyFlowConfirmationMessages } from '@/app/features/flows/components/execute-risky-flow-dialog/execute-risky-flow-confirmation-message';
import {
  ExecuteRiskyFlowDialog,
  useExecuteRiskyFlowDialog,
} from '@/app/features/flows/components/execute-risky-flow-dialog/execute-risky-flow-dialog';
import { FlowStatusToggle } from '@/app/features/flows/components/flow-status-toggle';
import { FlowVersionStateDot } from '@/app/features/flows/components/flow-version-state-dot';
import { useLockAndPublish } from './hooks/lock-and-publish';

const BuilderPublishButton = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const [flowVersion, flow, isSaving, setFlow, readonly, setLeftSidebar] =
    useBuilderStateContext((state) => [
      state.flowVersion,
      state.flow,
      state.saving,
      state.setFlow,
      state.readonly,
      state.setLeftSidebar,
    ]);

  const { switchToDraft, isSwitchingToDraftPending } = useSwitchToDraft();
  const { mutatePublish, isPublishingPending } = useLockAndPublish();

  const isPublishedVersion =
    flow.publishedVersionId === flowVersion.id &&
    flowVersion.state === FlowVersionState.LOCKED;

  const {
    isDialogOpen,
    riskyStepNames,
    isLoading,
    handleExecuting,
    handleExecutingConfirm,
    handleExecutingCancel,
    setIsDialogOpen,
  } = useExecuteRiskyFlowDialog(flowVersion, mutatePublish);

  const isValid = flowVersion.valid;
  return (
    <div
      className={cn('h-[42px] flex items-center rounded-xl gap-2 z-50', {
        'bg-background shadow-editor pl-4 pr-[5px]':
          !readonly && flow.publishedVersionId,
      })}
    >
      {!readonly && flow.publishedVersionId && (
        <div className="flex items-center gap-2">
          <FlowVersionStateDot state={flowVersion.state}></FlowVersionStateDot>
          <FlowStatusToggle
            flow={flow}
            flowVersion={flowVersion}
            onFlowStatusChange={(status) => setFlow({ ...flow, status })}
          ></FlowStatusToggle>
        </div>
      )}

      {!readonly && (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="disabled:pointer-events-auto">
                <Button
                  variant={'greenRounded'}
                  loading={isSaving || isLoading || isPublishingPending}
                  disabled={
                    isPublishedVersion || readonly || !isValid || isLoading
                  }
                  onClick={() => handleExecuting()}
                  className={cn('text-sm', {
                    'h-9': !!flow.publishedVersionId,
                    'h-[42px]': !flow.publishedVersionId,
                  })}
                >
                  {t('Publish')}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isPublishedVersion
                  ? t('Latest version is published')
                  : !isValid
                  ? t('Your workflow has incomplete steps')
                  : t('Publish')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ExecuteRiskyFlowDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            riskyStepNames={riskyStepNames}
            message={ExecuteRiskyFlowConfirmationMessages.GENERAL}
            onConfirm={handleExecutingConfirm}
            onCancel={handleExecutingCancel}
          />
        </>
      )}
      {readonly && (
        <Button
          size={'lg'}
          variant={'greenRounded'}
          loading={isSwitchingToDraftPending || isSaving}
          onClick={() => {
            if (location.pathname.includes('/runs')) {
              navigate(
                `/flows/${flow.id}?folderId=${flow.folderId ?? ''}&${
                  SEARCH_PARAMS.viewOnly
                }=false`,
              );
            } else {
              switchToDraft();
              setLeftSidebar(LeftSideBarType.NONE);
              setSearchParams((params) => {
                params.set(SEARCH_PARAMS.viewOnly, 'false');
                return params;
              });
            }
          }}
          className="h-[42px] shadow-editor text-sm"
        >
          {t('Edit')}
        </Button>
      )}
    </div>
  );
});

BuilderPublishButton.displayName = 'BuilderPublishButton';
export { BuilderPublishButton };
