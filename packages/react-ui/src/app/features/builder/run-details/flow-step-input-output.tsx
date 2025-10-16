import { TestStepDataViewer } from '@openops/components/ui';
import { t } from 'i18next';
import { Timer } from 'lucide-react';
import React from 'react';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { useTheme } from '@/app/common/providers/theme-provider';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { TestRunActionLimitReachedPlate } from '@/app/features/builder/run-details/test-run-action-limit-reached-plate';
import { StepStatusIcon } from '@/app/features/flow-runs/components/step-status-icon';
import { formatUtils } from '@/app/lib/utils';
import { FlagId, flowHelper, StepOutput } from '@openops/shared';

const FlowStepInputOutput = React.memo(
  ({ stepDetails }: { stepDetails: StepOutput }) => {
    const stepOutput = formatUtils.formatStepInputOrOutput(
      stepDetails.errorMessage ?? stepDetails.output,
    );

    const durationEnabled = flagsHooks.useFlag<boolean>(
      FlagId.SHOW_DURATION,
    ).data;

    const [flowVersion, selectedStepName] = useBuilderStateContext((state) => [
      state.flowVersion,
      state.selectedStep,
    ]);
    const selectedStep = selectedStepName
      ? flowHelper.getStep(flowVersion, selectedStepName)
      : undefined;

    const { theme } = useTheme();
    if (!stepDetails) {
      return null;
    }
    return (
      <div className="h-full flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2 justify-start mb-4">
          <StepStatusIcon status={stepDetails.status} size="5"></StepStatusIcon>
          <div>{selectedStep?.displayName}</div>
        </div>
        <div className="flex items-center gap-1 justify-start">
          {durationEnabled && (
            <>
              {' '}
              <Timer className="w-5 h-5" />{' '}
              <span>
                {t('Duration')}:{' '}
                {formatUtils.formatDuration(stepDetails.duration ?? 0, false)}
              </span>
            </>
          )}
        </div>
        <TestRunActionLimitReachedPlate
          error={'Action limit reached: N runs'}
        />
        <TestStepDataViewer
          inputJson={stepDetails.input}
          outputJson={stepOutput}
          theme={theme}
        />
      </div>
    );
  },
);

FlowStepInputOutput.displayName = 'FlowStepInputOutput';
export { FlowStepInputOutput };
