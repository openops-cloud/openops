import { BlockProperty } from '@openops/blocks-framework';
import {
  FormItem,
  FormLabel,
  GenerateWithAIButton,
  ReadMoreDescription,
  ToggleSwitch,
  ToggleSwitchOption,
} from '@openops/components/ui';
import { Action, isNil, Trigger } from '@openops/shared';
import { t } from 'i18next';
import { useCallback, useContext, useEffect } from 'react';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';

import { TextInputWithMentions } from './text-input-with-mentions';
import { CUSTOMIZED_INPUT_KEY, isDynamicViewToggled } from './utils';

import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { ArrayFieldContext } from '@/app/features/builder/block-properties/dynamic-array/array-field-context';
import { useAppStore } from '@/app/store/app-store';
import { useSafeBuilderStateContext } from '../builder-hooks';

type inputNameLiteral = `settings.input.${string}`;

const isInputNameLiteral = (
  inputName: string,
): inputName is inputNameLiteral => {
  return inputName.match(/settings\.input\./) !== null;
};
type AutoFormFieldWrapperProps = {
  children: React.ReactNode;
  allowDynamicValues: boolean;
  propertyName: string;
  property: BlockProperty;
  hideDescription?: boolean;
  placeBeforeLabelText?: boolean;
  disabled: boolean;
  field: ControllerRenderProps;
  inputName: `settings.input.${string}`;
};

const getInitialFieldValue = (
  fieldValue: string,
  defaultValue: any,
  isDirty: boolean,
) => {
  // field was explicitly cleared
  if (isDirty && isNil(fieldValue)) {
    return null;
  }

  return fieldValue ?? defaultValue ?? null;
};

const DYNAMIC_TOGGLE_VALUES = {
  STATIC: 'Static',
  DYNAMIC: 'Dynamic',
};

const TOGGLE_OPTIONS: ToggleSwitchOption[] = [
  {
    value: DYNAMIC_TOGGLE_VALUES.STATIC,
    label: t('Static'),
    tooltipText: t('Use a static pre-defined value'),
  },
  {
    value: DYNAMIC_TOGGLE_VALUES.DYNAMIC,
    label: t('Dynamic'),
    tooltipText: t(
      'Static values stay the same, while dynamic values update based on data from other steps',
    ),
  },
];

type FormLabelButtonProps = {
  property?: BlockProperty;
  allowDynamicValues: boolean;
  disabled: boolean;
  dynamicViewToggled: boolean;
  handleDynamicValueChange: (value: string) => void;
  onGenerateWithAIClick: () => void;
};

const FormLabelButton = ({
  property,
  allowDynamicValues,
  disabled,
  dynamicViewToggled,
  handleDynamicValueChange,
  onGenerateWithAIClick,
}: FormLabelButtonProps) => {
  const readonly = useSafeBuilderStateContext((s) => s?.readonly);
  const isAiChatVisible = useSafeBuilderStateContext(
    (s) => s?.midpanelState?.showAiChat,
  );

  const { hasActiveAiSettings, isLoading } =
    aiSettingsHooks.useHasActiveAiSettings();

  const shouldShowAIButton =
    property && 'supportsAI' in property && property.supportsAI && !readonly;

  if (shouldShowAIButton) {
    return (
      <GenerateWithAIButton
        hasActiveAiSettings={hasActiveAiSettings}
        isLoading={isLoading}
        isAiChatVisible={!!isAiChatVisible}
        settingsPath="/settings/ai"
        onGenerateWithAIClick={onGenerateWithAIClick}
      />
    );
  }

  if (allowDynamicValues) {
    return (
      <ToggleSwitch
        options={TOGGLE_OPTIONS}
        onChange={handleDynamicValueChange}
        defaultValue={
          dynamicViewToggled
            ? DYNAMIC_TOGGLE_VALUES.DYNAMIC
            : DYNAMIC_TOGGLE_VALUES.STATIC
        }
        disabled={disabled}
      />
    );
  }

  return null;
};

const AutoFormFieldWrapper = ({
  placeBeforeLabelText = false,
  children,
  hideDescription,
  allowDynamicValues,
  propertyName,
  inputName,
  property,
  disabled,
  field,
}: AutoFormFieldWrapperProps) => {
  const form = useFormContext<Action | Trigger>();
  const fieldState = form.getFieldState(inputName);

  const { setIsAiChatOpened } = useAppStore((s) => ({
    setIsAiChatOpened: s.setIsAiChatOpened,
  }));

  const arrayFieldContext = useContext(ArrayFieldContext);

  const dynamicViewToggled: boolean = isDynamicViewToggled(
    form,
    arrayFieldContext,
    propertyName,
    inputName,
  );

  // This `useEffect` ensures a one-time migration of the dynamic flag for non-array fields.
  // - The `arrayFieldContext` is checked to skip this logic for array fields, which use a different `dynamic flag` structure .
  // - This handles cases where `propertyName` was used instead of `inputName`.
  // TODO: Remove this migration logic once workflows are fully updated. (https://linear.app/openops/issue/OPS-573/remove-migration-logic-from-auto-form-field-wrapper)
  useEffect(() => {
    if (!arrayFieldContext && propertyName && inputName) {
      const oldCustomizedInputFlag = form.getValues(
        `${CUSTOMIZED_INPUT_KEY}${propertyName}`,
      );

      if (oldCustomizedInputFlag !== undefined) {
        setTimeout(() => {
          form.setValue(`${CUSTOMIZED_INPUT_KEY}${propertyName}`, undefined);
          form.setValue(
            `${CUSTOMIZED_INPUT_KEY}${inputName}`,
            oldCustomizedInputFlag,
            {
              shouldValidate: true,
            },
          );
        });
      }
    }
  }, [propertyName, inputName, arrayFieldContext]);

  // array fields use the dynamicViewToggled property to specify if a property is toggled
  function handleChange(value: string) {
    const isInDynamicView = value === DYNAMIC_TOGGLE_VALUES.DYNAMIC;
    if (arrayFieldContext) {
      form.setValue(
        `${arrayFieldContext.inputName}.dynamicViewToggled.${propertyName}`,
        isInDynamicView,
        {
          shouldValidate: true,
        },
      );
    } else {
      // The structure has changed. Previously we store information based on `propertyName`,
      // but replaced it with `inputName`, so to avoid migrating existing workflows,
      // added logic to delete the old structure and replace it with the new one.
      // TODO: Remove the deletion once all workflows are migrated.
      form.setValue(`${CUSTOMIZED_INPUT_KEY}${propertyName}`, undefined);
      form.setValue(`${CUSTOMIZED_INPUT_KEY}${inputName}`, isInDynamicView, {
        shouldValidate: true,
      });
    }

    if (isInputNameLiteral(inputName)) {
      if (isInDynamicView) {
        const dynamicViewInitialValue = getInitialFieldValue(
          form.getValues(inputName),
          property.defaultValue,
          fieldState.isDirty,
        );
        form.setValue(inputName, dynamicViewInitialValue, {
          shouldValidate: true,
        });
      } else {
        // clear value if we go from dynamic to normal value that could be constrained (ex dropdown)
        form.setValue(inputName, null, {
          shouldValidate: true,
        });
      }
    } else {
      throw new Error(
        'inputName is not a member of step settings input, you might be using dynamic properties where you should not',
      );
    }
  }

  const dispatch = useSafeBuilderStateContext(
    (state) => state.applyMidpanelAction,
  );

  const onGenerateWithAIClick = useCallback(() => {
    dispatch?.({
      type: 'GENERATE_WITH_AI_CLICK',
      property: {
        ...property,
        inputName,
      },
    });
    setIsAiChatOpened(false);
  }, [dispatch, property, inputName, setIsAiChatOpened]);

  return (
    <FormItem className="flex flex-col gap-1">
      <FormLabel className="flex items-center gap-1">
        {placeBeforeLabelText && !dynamicViewToggled && children}
        <span>{t(property.displayName)}</span>
        {property.required && <span className="text-destructive">*</span>}
        <span className="grow"></span>
        <FormLabelButton
          property={property}
          allowDynamicValues={allowDynamicValues}
          disabled={disabled}
          dynamicViewToggled={dynamicViewToggled}
          handleDynamicValueChange={handleChange}
          onGenerateWithAIClick={onGenerateWithAIClick}
        />
      </FormLabel>

      {dynamicViewToggled && (
        <TextInputWithMentions
          disabled={disabled}
          onChange={field.onChange}
          initialValue={field.value ?? null}
        ></TextInputWithMentions>
      )}
      {!placeBeforeLabelText && !dynamicViewToggled && <div>{children}</div>}
      {property.description && !hideDescription && (
        <ReadMoreDescription text={t(property.description)} />
      )}
    </FormItem>
  );
};

AutoFormFieldWrapper.displayName = 'AutoFormFieldWrapper';

export { AutoFormFieldWrapper };
