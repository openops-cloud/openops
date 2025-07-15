import { flowRunUtils } from '@/app/features/flow-runs/lib/flow-run-utils';
import { cn, TooltipWrapper } from '@openops/components/ui';
import { isNil, StepOutputStatus } from '@openops/shared';
import { t } from 'i18next';
import { Info } from 'lucide-react';
import React from 'react';

const SampleDataIcon = () => {
  return (
    <TooltipWrapper
      tooltipText={t('Step contains sample data')}
      tooltipPlacement="bottom"
    >
      <Info
        className="min-w-4 w-4 h-4 text-blueAccent"
        role="img"
        aria-label={t('Step contains sample data')}
      />
    </TooltipWrapper>
  );
};

const TestStatusIcon = ({
  success,
}: {
  success: boolean | null | undefined;
}) => {
  if (isNil(success)) {
    return null;
  }

  const { Icon } = flowRunUtils.getStatusIconForStep(
    success ? StepOutputStatus.SUCCEEDED : StepOutputStatus.FAILED,
  );
  const message = success ? 'Tested Successfully' : 'Testing failed';

  return (
    <TooltipWrapper tooltipText={t(message)} tooltipPlacement="bottom">
      <Icon
        className={cn('size-4', {
          'text-success-300': success,
          'text-destructive-300': !success,
        })}
        aria-label={t(message)}
      />
    </TooltipWrapper>
  );
};

export const DataSelectorNodeStatusIcon = ({
  stepHasSampleData,
  success,
}: {
  stepHasSampleData: boolean;
  success: boolean | null | undefined;
}) => {
  if (stepHasSampleData) {
    return <SampleDataIcon />;
  }

  return <TestStatusIcon success={success} />;
};
