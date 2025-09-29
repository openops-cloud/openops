import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  EditableText,
  Form,
  ScrollArea,
  SidebarHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  UNSAVED_CHANGES_TOAST,
  useToast,
} from '@openops/components/ui';
import {
  Action,
  ActionType,
  debounce,
  FlowOperationType,
  Trigger,
  TriggerType,
} from '@openops/shared';
import deepEqual from 'fast-deep-equal';
import { t } from 'i18next';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useUpdateEffect } from 'react-use';

import { BlockCardInfo } from '../../blocks/components/block-selector-card';
import { ActionErrorHandlingForm } from '../block-properties/action-error-handling';
import { formUtils } from '../block-properties/form-utils';
import { TestStepContainer } from '../test-step';

import { BlockSettings } from './block-settings';
import { BranchSettings } from './branch-settings';
import { CodeSettings } from './code-settings';
import { useApplyCodeToInject } from './hooks/use-apply-code-to-inject';
import { LoopsSettings } from './loops-settings';
import { SplitSettings } from './split-settings';
import { useStepSettingsContext } from './step-settings-context';

import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { useDynamicFormValidationContext } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';

const TAB_CONFIGURE = 'configure';
const TAB_TEST = 'test';
const KEY_TO_TRIGGER_TEST = 'KeyG';

const StepSettingsContainer = React.memo(() => {
  const { selectedStep, blockModel, selectedStepTemplateModel } =
    useStepSettingsContext();
  const [
    readonly,
    exitStepSettings,
    applyOperation,
    saving,
    flowVersion,
    refreshBlockFormSettings,
    midpanelState,
    applyMidpanelAction,
  ] = useBuilderStateContext((state) => [
    state.readonly,
    state.exitStepSettings,
    state.applyOperation,
    state.saving,
    state.flowVersion,
    state.refreshBlockFormSettings,
    state.midpanelState,
    state.applyMidpanelAction,
  ]);

  const defaultValues = useMemo(() => {
    return formUtils.buildBlockDefaultValue(selectedStep, blockModel, true);
  }, [selectedStep, blockModel]);

  const { stepMetadata } = blocksHooks.useStepMetadata({
    step: selectedStep,
  });

  const stepTemplateMetadata = blocksHooks.useStepTemplateMetadata({
    stepMetadata,
    stepTemplateModel: selectedStepTemplateModel,
  });

  const { toast } = useToast();

  const debouncedTrigger = useMemo(() => {
    return debounce((newTrigger: Trigger) => {
      applyOperation(
        {
          type: FlowOperationType.UPDATE_TRIGGER,
          request: newTrigger,
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      );
    }, 200);
  }, [applyOperation]);

  const debouncedAction = useMemo(() => {
    return debounce((newAction: Action) => {
      applyOperation(
        {
          type: FlowOperationType.UPDATE_ACTION,
          request: newAction,
        },
        () => toast(UNSAVED_CHANGES_TOAST),
      );
    }, 200);
  }, [applyOperation]);

  const { formSchema, setFormSchema, formSchemaRef } =
    useDynamicFormValidationContext();

  useEffect(() => {
    if (!formSchemaRef.current && selectedStep) {
      const schema = formUtils.buildBlockSchema(
        selectedStep.type,
        selectedStep.settings.actionName ?? selectedStep.settings.triggerName,
        blockModel ?? null,
      );

      if (schema) {
        formSchemaRef.current = true;
        setFormSchema(schema);
      }
    }
  }, [selectedStep, blockModel, setFormSchema, formSchemaRef]);

  const form = useForm<Action | Trigger>({
    mode: 'onChange',
    disabled: readonly,
    reValidateMode: 'onChange',
    defaultValues,
    resolver: typeboxResolver(formSchema),
  });

  useEffect(() => {
    form.trigger();
  }, [formSchema, defaultValues]);

  useEffect(() => {
    form.reset(defaultValues);
    form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshBlockFormSettings]);

  useApplyCodeToInject({
    form,
    midpanelState,
    applyMidpanelAction,
  });

  useUpdateEffect(() => {
    form.setValue('valid', form.formState.isValid);
  }, [form.formState.isValid]);

  const inputChanges = useWatch({
    name: 'settings.input',
    control: form.control,
  });
  const splitBranchChanges = useWatch({
    name: 'settings.defaultBranch',
    control: form.control,
  });
  const splitOptionsChanges = useWatch({
    name: 'settings.options',
    control: form.control,
  });
  const validChange = useWatch({
    name: 'valid',
    control: form.control,
  });
  const itemsChange = useWatch({
    name: 'settings.items',
    control: form.control,
  });
  const conditionsChange = useWatch({
    name: 'settings.conditions',
    control: form.control,
  });
  const sourceCodeChange = useWatch({
    name: 'settings.sourceCode',
    control: form.control,
  });
  const inputUIInfo = useWatch({
    name: 'settings.inputUiInfo',
    control: form.control,
  });
  const errorHandlingOptions = useWatch({
    name: 'settings.errorHandlingOptions',
    control: form.control,
  });
  const displayName = useWatch({
    name: 'displayName',
    control: form.control,
  });

  const previousSavedStep = useRef<Action | Trigger | null>(null);

  useEffect(() => {
    const currentStep = JSON.parse(JSON.stringify(form.getValues()));
    if (previousSavedStep.current === null) {
      previousSavedStep.current = currentStep;
      return;
    }
    if (deepEqual(currentStep, previousSavedStep.current)) {
      return;
    }
    previousSavedStep.current = currentStep;

    if (currentStep.type === TriggerType.BLOCK) {
      debouncedTrigger(currentStep as Trigger);
    } else {
      debouncedAction(currentStep as Action);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inputChanges,
    itemsChange,
    errorHandlingOptions,
    conditionsChange,
    sourceCodeChange,
    inputUIInfo,
    validChange,
    displayName,
    splitBranchChanges,
    splitOptionsChanges,
  ]);
  const sidebarHeaderContainerRef = useRef<HTMLDivElement>(null);
  const modifiedStep = form.getValues();

  const [activeTab, setActiveTab] = useState(TAB_CONFIGURE);
  const [shouldTriggerTest, setShouldTriggerTest] = useState(false);
  const handleTestTriggered = useCallback(() => {
    setShouldTriggerTest(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (readonly) return;
      if ((e.metaKey || e.ctrlKey) && e.code === KEY_TO_TRIGGER_TEST) {
        e.preventDefault();
        setActiveTab('test');
        setShouldTriggerTest(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [readonly]);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => e.preventDefault()}
        onChange={(e) => e.preventDefault()}
        className="w-full h-full flex flex-col"
      >
        <div ref={sidebarHeaderContainerRef}>
          <SidebarHeader onClose={() => exitStepSettings()}>
            <EditableText
              containerRef={sidebarHeaderContainerRef}
              onValueChange={(value) => {
                form.setValue('displayName', value);
              }}
              readonly={readonly}
              value={modifiedStep.displayName}
              tooltipContent={t('Edit Step Name')}
            />
          </SidebarHeader>
        </div>
        <div className="w-full flex-1 min-h-0">
          <div className="flex flex-col gap-2 pl-4 pr-4 pb-6 h-full min-h-0">
            {!!stepMetadata && (
              <BlockCardInfo
                stepMetadata={stepMetadata}
                interactive={false}
                stepTemplateMetadata={stepTemplateMetadata}
              />
            )}

            <div className="border rounded-sm overflow-hidden pt-0 flex flex-col flex-1 min-h-0">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full flex-1 min-h-0 flex flex-col"
              >
                <div className="sticky top-0 bg-background border-b rounded-t-sm">
                  <TabsList className="grid grid-cols-2 w-full h-auto rounded-t-sm rounded-b-none bg-background p-0">
                    <TabsTrigger
                      value={TAB_CONFIGURE}
                      disabled={readonly}
                      className="text-base justify-start text-primary-800 text-left font-normal rounded-t-sm rounded-tr-none rounded-b-none data-[state=active]:bg-gray-200 data-[state=active]:font-medium transition-colors duration-200"
                    >
                      {t('Configure')}
                    </TabsTrigger>
                    <TabsTrigger
                      value={TAB_TEST}
                      disabled={readonly}
                      className="text-base justify-start text-primary-800 text-left font-normal rounded-t-sm rounded-tl-none rounded-b-none data-[state=active]:bg-gray-200 data-[state=active]:font-medium transition-colors duration-200"
                    >
                      {t('Test')}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value={TAB_CONFIGURE}
                  className="mt-2 flex-1 min-h-0"
                >
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-2 pl-2 pr-4 pb-4">
                      {modifiedStep.type === ActionType.LOOP_ON_ITEMS && (
                        <LoopsSettings readonly={readonly} />
                      )}
                      {modifiedStep.type === ActionType.CODE && (
                        <CodeSettings readonly={readonly} />
                      )}
                      {modifiedStep.type === ActionType.BRANCH && (
                        <BranchSettings readonly={readonly} />
                      )}
                      {modifiedStep.type === ActionType.SPLIT && (
                        <SplitSettings readonly={readonly} />
                      )}
                      {modifiedStep.type === ActionType.BLOCK &&
                        modifiedStep && (
                          <BlockSettings
                            step={modifiedStep}
                            flowId={flowVersion.flowId}
                            readonly={readonly}
                          />
                        )}
                      {modifiedStep.type === TriggerType.BLOCK &&
                        modifiedStep && (
                          <BlockSettings
                            step={modifiedStep}
                            flowId={flowVersion.flowId}
                            readonly={readonly}
                          />
                        )}
                      {[ActionType.CODE, ActionType.BLOCK].includes(
                        modifiedStep.type as ActionType,
                      ) && (
                        <ActionErrorHandlingForm
                          hideContinueOnFailure={
                            modifiedStep.settings.errorHandlingOptions
                              ?.continueOnFailure?.hide
                          }
                          disabled={readonly}
                          hideRetryOnFailure={
                            modifiedStep.settings.errorHandlingOptions
                              ?.retryOnFailure?.hide
                          }
                        />
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value={TAB_TEST} className="mt-0 flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="flex flex-col gap-2 pl-2 pr-2 h-full min-h-0">
                      {modifiedStep.type && (
                        <div className="flex-1 min-h-0 h-full">
                          <TestStepContainer
                            type={modifiedStep.type}
                            flowId={flowVersion.flowId}
                            flowVersionId={flowVersion.id}
                            isSaving={saving}
                            shouldTriggerTest={shouldTriggerTest}
                            onTestTriggered={handleTestTriggered}
                          />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
});
StepSettingsContainer.displayName = 'StepSettingsContainer';
export { StepSettingsContainer };
