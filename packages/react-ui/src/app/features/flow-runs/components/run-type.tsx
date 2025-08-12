import { FlowRunTriggerSource } from '@openops/shared';
import { t } from 'i18next';
import { CirclePlay, LucideProps, TestTubeDiagonal, Zap } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

const RunTypeContent: Record<
  FlowRunTriggerSource,
  {
    Icon: ForwardRefExoticComponent<
      Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
    >;
    text: string;
  }
> = {
  [FlowRunTriggerSource.TRIGGERED]: { Icon: Zap, text: t('Triggered') },
  [FlowRunTriggerSource.MANUAL_RUN]: {
    Icon: CirclePlay,
    text: t('Manual run'),
  },
  [FlowRunTriggerSource.TEST_RUN]: {
    Icon: TestTubeDiagonal,
    text: t('Test run'),
  },
};

type RunTypeProps = {
  type: FlowRunTriggerSource;
};

const RunType = ({ type }: RunTypeProps) => {
  const Icon = RunTypeContent[type].Icon;
  const text = RunTypeContent[type].text;
  return (
    <div className="flex items-center gap-1">
      <Icon className="w-4 h-4" />
      <span className="text-sm font-normal dark:text-primary">{text}</span>
    </div>
  );
};

RunType.displayName = 'RunType';
export { RunType, RunTypeContent };
