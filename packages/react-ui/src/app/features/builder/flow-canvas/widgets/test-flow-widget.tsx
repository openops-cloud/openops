import {
  Button,
  INTERNAL_ERROR_TOAST,
  isMacUserAgent,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useEffect } from 'react';

import { useSocket } from '@/app/common/providers/socket-provider';
import { ExecuteRiskyFlowConfirmationMessages } from '@/app/features/flows/components/execute-risky-flow-dialog/execute-risky-flow-confirmation-message';
import {
  ExecuteRiskyFlowDialog,
  useExecuteRiskyFlowDialog,
} from '@/app/features/flows/components/execute-risky-flow-dialog/execute-risky-flow-dialog';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { FlowRun, FlowVersion, isNil, TriggerType } from '@openops/shared';

type TestFlowWidgetProps = {
  flowVersion: FlowVersion;
  setRun: (run: FlowRun, flowVersion: FlowVersion) => void;
};

const TestFlowWidget = ({ flowVersion, setRun }: TestFlowWidgetProps) => {
  const socket = useSocket();
  const isMac = isMacUserAgent();

  const triggerHasSampleData =
    flowVersion.trigger.type === TriggerType.BLOCK &&
    !isNil(flowVersion.trigger.settings.inputUiInfo?.currentSelectedData);

  const { mutate, isPending } = useMutation<void>({
    mutationFn: () =>
      flowsApi.testFlow(
        socket,
        {
          flowVersionId: flowVersion.id,
        },
        (run) => {
          setRun(run, flowVersion);
        },
      ),
    onError: (error) => {
      console.error(error);
      toast(INTERNAL_ERROR_TOAST);
    },
  });

  const {
    isDialogOpen,
    riskyStepNames,
    isLoading,
    handleExecuting,
    handleExecutingConfirm,
    handleExecutingCancel,
    setIsDialogOpen,
  } = useExecuteRiskyFlowDialog(flowVersion, mutate);

  useEffect(() => {
    const keydownHandler = (event: KeyboardEvent) => {
      if (
        (isMac && event.metaKey && event.key.toLocaleLowerCase() === 'd') ||
        (!isMac && event.ctrlKey && event.key.toLocaleLowerCase() === 'd')
      ) {
        event.preventDefault();
        event.stopPropagation();

        if (!isPending && triggerHasSampleData) {
          handleExecuting();
        }
      }
    };

    window.addEventListener('keydown', keydownHandler, { capture: true });

    return () => {
      window.removeEventListener('keydown', keydownHandler, { capture: true });
    };
  }, [isMac, isPending, triggerHasSampleData]);

  return (
    flowVersion.valid && (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 !bg-primary-200/20 dark:!bg-primary-200 text-primary-300 disabled:pointer-events-auto hover:!border-primary-200 hover:!text-primary-300 border-primary-200/50 border border-solid rounded-full animate-fade"
              disabled={!triggerHasSampleData}
              loading={isPending || isLoading}
              onClick={() => handleExecuting()}
            >
              <div className="flex justify-center items-center gap-2">
                {t('Test Workflow')}
                <span className="text-[10px] tracking-widest whitespace-nowrap">
                  {isMac ? '⌘ + D' : 'Ctrl + D'}
                </span>
              </div>
            </Button>
          </TooltipTrigger>
          {!triggerHasSampleData && (
            <TooltipContent side="bottom">
              {t('Please test the trigger first')}
            </TooltipContent>
          )}
        </Tooltip>

        <ExecuteRiskyFlowDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          riskyStepNames={riskyStepNames}
          message={ExecuteRiskyFlowConfirmationMessages.GENERAL}
          onConfirm={handleExecutingConfirm}
          onCancel={handleExecutingCancel}
        />
      </>
    )
  );
};

TestFlowWidget.displayName = 'TestFlowWidget';

export { TestFlowWidget };
