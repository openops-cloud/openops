import { useTheme } from '@/app/common/providers/theme-provider';
import { useStepSettingsContext } from '@/app/features/builder/step-settings/step-settings-context';
import { stepTestOutputHooks } from '@/app/features/builder/test-step/step-test-output-hooks';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TestStepDataViewer,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openops/components/ui';
import { Action, ActionType, Trigger, TriggerType } from '@openops/shared';
import { t } from 'i18next';
import { Info } from 'lucide-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { TestActionSection } from './test-action-section';
import { TestTriggerSection } from './test-trigger-section';

type TestStepContainerProps = {
  flowVersionId: string;
  isSaving: boolean;
  flowId: string;
  type: ActionType | TriggerType;
};

enum TabListEnum {
  STEP_OUTPUT = 'STEP_OUTPUT',
  SAMPLE_STEP_OUTPUT = 'SAMPLE_STEP_OUTPUT',
}

const TestStepContainer = React.memo(
  ({ flowVersionId, isSaving, type, flowId }: TestStepContainerProps) => {
    const { theme } = useTheme();
    const form = useFormContext<Action | Trigger>();
    const useSaveSelectedStepSampleData =
      stepTestOutputHooks.useSaveSelectedStepSampleData(form);

    const { selectedStep } = useStepSettingsContext();

    return (
      <Tabs
        defaultValue={TabListEnum.STEP_OUTPUT}
        className="w-full flex flex-col items-start justify-start gap-2 pb-2"
      >
        <TabsList className="grid grid-cols-2 bg-transparent border-none rounded-none w-full">
          <TabsTrigger
            value={TabListEnum.STEP_OUTPUT}
            className="justify-start text-left font-normal data-[state=active]:font-bold text-primary-300 text-base pl-0 pr-2 dark:text-white rounded-none  border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300"
          >
            {t('Step output')}
          </TabsTrigger>
          <TabsTrigger
            value={TabListEnum.SAMPLE_STEP_OUTPUT}
            className="justify-start text-left font-normal data-[state=active]:font-bold text-primary-300 text-base pr-0 pl-2 dark:text-white rounded-none border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300 gap-1"
          >
            {t('Sample output data')}
            <Tooltip>
              <TooltipTrigger asChild aria-label={t('Sample output info')}>
                <Info className="w-4 h-4 text-black" />
              </TooltipTrigger>
              <TooltipContent
                avoidCollisions
                hideWhenDetached
                side="bottom"
                className="font-medium text-left text-black max-w-[418px] text-wrap"
              >
                {t(
                  'Sample data is for building and testing only - scheduled runs and test workflow are using the real step output.',
                )}
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value={TabListEnum.STEP_OUTPUT}
          className="w-full h-full overflow-hidden"
        >
          {type === TriggerType.BLOCK ? (
            <TestTriggerSection
              flowId={flowId}
              isSaving={isSaving}
              flowVersionId={flowVersionId}
            ></TestTriggerSection>
          ) : (
            <TestActionSection
              flowVersionId={flowVersionId}
              isSaving={isSaving}
            ></TestActionSection>
          )}
        </TabsContent>
        <TabsContent
          value={TabListEnum.SAMPLE_STEP_OUTPUT}
          className="w-full overflow-hidden"
        >
          <div className="h-full flex">
            <TestStepDataViewer
              outputJson={selectedStep?.settings?.inputUiInfo?.sampleData ?? ''}
              onChange={useSaveSelectedStepSampleData}
              readonly={false}
              theme={theme}
            />
          </div>
        </TabsContent>
      </Tabs>
    );
  },
);
TestStepContainer.displayName = 'TestStepContainer';

export { TestStepContainer };
