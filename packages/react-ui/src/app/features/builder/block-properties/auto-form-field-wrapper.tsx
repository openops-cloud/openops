import { BlockProperty } from '@openops/blocks-framework';
import {
  FormItem,
  FormLabel,
  GenerateWithAIButton,
  ReadMoreDescription,
  ToggleSwitch,
  ToggleSwitchOption,
} from '@openops/components/ui';
import { isNil } from '@openops/shared';
import { t } from 'i18next';
import { useCallback, useContext } from 'react';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';

import { TextInputWithMentions } from './text-input-with-mentions';
import { CUSTOMIZED_INPUT_KEY, isDynamicViewToggled } from './utils';

import { aiSettingsHooks } from '@/app/features/ai/lib/ai-settings-hooks';
import { ArrayFieldContext } from '@/app/features/builder/block-properties/dynamic-array/array-field-context';
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
  labelPlacement?: 'top' | 'left';
  disabled: boolean;
  field: ControllerRenderProps;
  inputName: string;
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

type LabelContentProps = {
  property: BlockProperty;
  placeBeforeLabelText: boolean;
  dynamicViewToggled: boolean;
  children: React.ReactNode;
};

const LabelContent = ({
  property,
  placeBeforeLabelText,
  dynamicViewToggled,
  children,
}: LabelContentProps) => {
  return (
    <FormLabel className="flex items-center gap-1">
      {placeBeforeLabelText && !dynamicViewToggled && children}
      <span>{t(property.displayName)}</span>
      {property.required && <span className="text-destructive">*</span>}
    </FormLabel>
  );
};

const AutoFormFieldWrapper = ({
  placeBeforeLabelText = false,
  labelPlacement = 'top',
  children,
  hideDescription,
  allowDynamicValues,
  propertyName,
  inputName,
  property,
  disabled,
  field,
}: AutoFormFieldWrapperProps) => {
  const form = useFormContext();
  const fieldState = form.getFieldState(inputName);

  const arrayFieldContext = useContext(ArrayFieldContext);

  const dynamicViewToggled: boolean = isDynamicViewToggled(
    form,
    arrayFieldContext,
    propertyName,
    inputName,
  );

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
        // when switching from dynamic to static, set the default value
        form.setValue(inputName, property.defaultValue ?? null, {
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
  }, [dispatch, property, inputName]);

  return (
    <FormItem className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div>
          {labelPlacement === 'top' && (
            <LabelContent
              property={property}
              placeBeforeLabelText={placeBeforeLabelText}
              dynamicViewToggled={dynamicViewToggled}
            >
              {children}
            </LabelContent>
          )}
        </div>

        <FormLabelButton
          property={property}
          allowDynamicValues={allowDynamicValues}
          disabled={disabled}
          dynamicViewToggled={dynamicViewToggled}
          handleDynamicValueChange={handleChange}
          onGenerateWithAIClick={onGenerateWithAIClick}
        />
      </div>

      <div className="flex items-center gap-6">
        {labelPlacement === 'left' && (
          <div className="shrink-0">
            <LabelContent
              property={property}
              placeBeforeLabelText={placeBeforeLabelText}
              dynamicViewToggled={dynamicViewToggled}
            >
              {children}
            </LabelContent>
          </div>
        )}
        <div className="flex-1 min-w-0 overflow-visible">
          {dynamicViewToggled && (
            <TextInputWithMentions
              disabled={disabled}
              onChange={field.onChange}
              initialValue={field.value ?? null}
            ></TextInputWithMentions>
          )}
          {!placeBeforeLabelText && !dynamicViewToggled && (
            <div>{children}</div>
          )}
        </div>
      </div>

      {property.description && !hideDescription && (
        <ReadMoreDescription text={t(property.description)} />
      )}
    </FormItem>
  );
};

AutoFormFieldWrapper.displayName = 'AutoFormFieldWrapper';

export { AutoFormFieldWrapper };
