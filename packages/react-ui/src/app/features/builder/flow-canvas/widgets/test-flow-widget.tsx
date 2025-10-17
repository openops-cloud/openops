import {
  Button,
  cn,
  INTERNAL_ERROR_TOAST,
  isMacUserAgent,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipWrapper,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useEffect } from 'react';

import { useSocket } from '@/app/common/providers/socket-provider';
import { TestRunLimitsDialog } from '@/app/features/builder/test-run-limits/test-run-limits-dialog';
import { ExecuteRiskyFlowConfirmationMessages } from '@/app/features/flows/components/execute-risky-flow-dialog/execute-risky-flow-confirmation-message';
import {
  ExecuteRiskyFlowDialog,
  useExecuteRiskyFlowDialog,
} from '@/app/features/flows/components/execute-risky-flow-dialog/execute-risky-flow-dialog';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { FlowRun, FlowVersion, isNil, TriggerType } from '@openops/shared';
import { Settings } from 'lucide-react';
import { stepTestOutputHooks } from '../../test-step/step-test-output-hooks';

type TestFlowWidgetProps = {
  flowVersion: FlowVersion;
  setRun: (run: FlowRun, flowVersion: FlowVersion) => void;
};

const TestFlowWidget = ({ flowVersion, setRun }: TestFlowWidgetProps) => {
  const socket = useSocket();
  const isMac = isMacUserAgent();

  const { data: triggerStepOuput } = stepTestOutputHooks.useStepTestOutput(
    flowVersion.id,
    flowVersion.trigger.id,
  );

  const triggerHasSampleData =
    flowVersion.trigger.type === TriggerType.BLOCK &&
    !isNil(triggerStepOuput?.lastTestDate) &&
    !isNil(triggerStepOuput?.output);

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
        <div className="h-8 flex rounded-full text-base font-medium">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 !bg-primary-200/20 dark:!bg-primary-200 text-primary-300 disabled:pointer-events-auto enabled:hover:!border-primary-200 enabled:hover:!text-primary-300 border-primary-200/70 border-r-primary-200/35 border-[1px] rounded-l-full animate-fade z-10"
                disabled={!triggerHasSampleData}
                loading={isPending || isLoading}
                onClick={() => handleExecuting()}
              >
                <div className="flex justify-center items-center gap-1">
                  {t('Test Workflow')}
                  <span className="tracking-widest whitespace-nowrap">
                    {isMac ? '⌘+D' : 'Ctrl+D'}
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
          <TooltipWrapper
            tooltipText={t('Test run limits')}
            tooltipPlacement="bottom"
          >
            <TestRunLimitsDialog>
              <Button
                variant="ghost"
                className={cn(
                  'h-8 pl-2 pr-[11px] !bg-primary-200/30 dark:!bg-primary-200 text-primary-300 hover:!border-primary-200 hover:!text-primary-300 border-[1px] border-primary-200/70 rounded-r-full animate-fade -ml-[1px]',
                  {
                    'border-l-primary-200/35': !triggerHasSampleData,
                  },
                )}
              >
                <Settings size={16} />
              </Button>
            </TestRunLimitsDialog>
          </TooltipWrapper>
        </div>

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
