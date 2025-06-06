import { useStepSettingsContext } from '@/app/features/builder/step-settings/step-settings-context';
import { stepTestOutputHooks } from '@/app/features/builder/test-step/step-test-output-hooks';
import {
  JsonViewer,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openops/components/ui';
import { ActionType, TriggerType } from '@openops/shared';
import { t } from 'i18next';
import React from 'react';
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
    const useSaveSelectedStepSampleData =
      stepTestOutputHooks.useSaveSelectedStepSampleData();

    const { selectedStep } = useStepSettingsContext();

    return (
      <div className="flex flex-col gap-4 px-4 py-1">
        <Tabs defaultValue={TabListEnum.STEP_OUTPUT}>
          <TabsList className="w-fit flex items-start gap-0 mb-5 bg-transparent border-none rounded-none">
            <TabsTrigger
              value={TabListEnum.STEP_OUTPUT}
              className="font-bold text-primary-300 text-base pl-0 pr-2 dark:text-white rounded-none  border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300"
            >
              {t('Step output')}
            </TabsTrigger>
            <TabsTrigger
              value={TabListEnum.SAMPLE_STEP_OUTPUT}
              className="font-bold text-primary-300 text-base pr-0 pl-2 dark:text-white rounded-none  border-b-2 data-[state=active]:bg-background data-[state=active]:text-primary-300 data-[state=active]:dark:text-white data-[state=active]:shadow-none data-[state=active]:border-blueAccent-300"
            >
              {t('Sample output data')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={TabListEnum.STEP_OUTPUT}>
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
          <TabsContent value={TabListEnum.SAMPLE_STEP_OUTPUT}>
            <JsonViewer
              title={t('Output')}
              onChange={useSaveSelectedStepSampleData}
              json={selectedStep?.settings?.inputUiInfo?.sampleData ?? ''}
              readonly={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  },
);
TestStepContainer.displayName = 'TestStepContainer';

export { TestStepContainer };
