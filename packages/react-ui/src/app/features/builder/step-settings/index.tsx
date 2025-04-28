import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  EditableText,
  Form,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  SidebarHeader,
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
import React, { useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useUpdateEffect } from 'react-use';

import { BlockCardInfo } from '../../blocks/components/block-selector-card';
import { ActionErrorHandlingForm } from '../block-properties/action-error-handling';
import { formUtils } from '../block-properties/form-utils';
import { TestStepContainer } from '../test-step';

import { BlockSettings } from './block-settings';
import { BranchSettings } from './branch-settings';
import { CodeSettings } from './code-settings';
import { LoopsSettings } from './loops-settings';
import { SplitSettings } from './split-settings';
import { useStepSettingsContext } from './step-settings-context';

import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { useDynamicFormValidationContext } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';

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

  useEffect(() => {
    if (midpanelState.codeToInject && midpanelState.aiChatProperty?.inputName) {
      form.setValue(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        midpanelState.aiChatProperty!.inputName,
        midpanelState.codeToInject,
        { shouldValidate: true },
      );

      applyMidpanelAction({ type: 'CLEAN_CODE_TO_INJECT' });
      form.trigger();
    }
  }, [form, midpanelState, applyMidpanelAction]);

  useUpdateEffect(() => {
    form.setValue('valid', form.formState.isValid);
  }, [form.formState.isValid]);

  // Watch changes in form execluding actionName or triggerName from watching //
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

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => e.preventDefault()}
        onChange={(e) => e.preventDefault()}
        className="w-full h-full"
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
            ></EditableText>
          </SidebarHeader>
        </div>

        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={55}>
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 px-4 pb-6">
                {!!stepMetadata && (
                  <BlockCardInfo
                    stepMetadata={stepMetadata}
                    interactive={false}
                    stepTemplateMetadata={stepTemplateMetadata}
                  ></BlockCardInfo>
                )}
                {modifiedStep.type === ActionType.LOOP_ON_ITEMS && (
                  <LoopsSettings readonly={readonly}></LoopsSettings>
                )}
                {modifiedStep.type === ActionType.CODE && (
                  <CodeSettings readonly={readonly}></CodeSettings>
                )}
                {modifiedStep.type === ActionType.BRANCH && (
                  <BranchSettings readonly={readonly}></BranchSettings>
                )}
                {modifiedStep.type === ActionType.SPLIT && (
                  <SplitSettings readonly={readonly}></SplitSettings>
                )}
                {modifiedStep.type === ActionType.BLOCK && modifiedStep && (
                  <BlockSettings
                    step={modifiedStep}
                    flowId={flowVersion.flowId}
                    readonly={readonly}
                  ></BlockSettings>
                )}
                {modifiedStep.type === TriggerType.BLOCK && modifiedStep && (
                  <BlockSettings
                    step={modifiedStep}
                    flowId={flowVersion.flowId}
                    readonly={readonly}
                  ></BlockSettings>
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
                      modifiedStep.settings.errorHandlingOptions?.retryOnFailure
                        ?.hide
                    }
                  ></ActionErrorHandlingForm>
                )}
              </div>
            </ScrollArea>
          </ResizablePanel>
          {!readonly && (
            <>
              <ResizableHandle withHandle={true} />
              <ResizablePanel defaultSize={45}>
                <ScrollArea className="h-[calc(100%-35px)] p-4 pb-10 ">
                  {modifiedStep.type && (
                    <TestStepContainer
                      type={modifiedStep.type}
                      flowId={flowVersion.flowId}
                      flowVersionId={flowVersion.id}
                      isSaving={saving}
                    ></TestStepContainer>
                  )}
                </ScrollArea>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </form>
    </Form>
  );
});
StepSettingsContainer.displayName = 'StepSettingsContainer';
export { StepSettingsContainer };
