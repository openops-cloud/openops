import {
  Button,
  FormControl,
  FormField,
  FormItem,
  Input,
  Sortable,
  SortableDragHandle,
  SortableItem,
  TextWithIcon,
} from '@openops/components/ui';
import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { t } from 'i18next';
import { Plus, TrashIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { ArrayPropertiesProvider } from '@/app/features/builder/block-properties/dynamic-array/array-properties-context';
import {
  enhanceDynamicProperties,
  isSimpleArray,
} from '@/app/features/builder/block-properties/dynamic-array/utils';
import { useDynamicFormValidationContext } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { ArrayProperty, BlockPropertyMap } from '@openops/blocks-framework';

import { AutoPropertiesFormComponent } from './auto-properties-form';
import {
  ArrayFieldContextProvider,
  ArrayItem,
} from './dynamic-array/array-field-context';
import { formUtils } from './form-utils';
import { TextInputWithMentions } from './text-input-with-mentions';

type ArrayPropertyProps = {
  inputName: string;
  useMentionTextInput: boolean;
  arrayProperty: ArrayProperty<boolean>;
  disabled: boolean;
};

const ArrayBlockProperty = ({
  inputName,
  useMentionTextInput,
  disabled,
  arrayProperty,
}: ArrayPropertyProps) => {
  const form = useFormContext();

  const { fields, append, move, remove } = useFieldArray({
    control: form.control,
    name: inputName,
  });

  const watchedFields = useWatch({
    name: inputName,
    control: form.control,
  });

  const {
    formSchemaRef,
    removeArrayItemFromSchema,
    addArrayItemToSchema,
    initArraySchema,
  } = useDynamicFormValidationContext();

  const isComplexArray = !isSimpleArray(arrayProperty);
  const parentPropertyKey = inputName.split('settings.input.')[1];
  const enhancedProperties = enhanceDynamicProperties(arrayProperty);

  const isSchemaInitialized = useRef(false);

  useEffect(() => {
    if (
      formSchemaRef.current &&
      !isSchemaInitialized.current &&
      isComplexArray
    ) {
      initArraySchema(
        inputName,
        arrayProperty.properties as BlockPropertyMap,
        arrayProperty.required,
        fields.length,
      );

      isSchemaInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSchemaRef.current, arrayProperty?.properties]);

  const appendNewArrayItem = () => {
    append(
      isComplexArray
        ? formUtils.getDefaultValueForStep(
            arrayProperty.properties as BlockPropertyMap,
            {},
          )
        : '',
    );
    if (isComplexArray) {
      addArrayItemToSchema(
        inputName,
        isComplexArray ? (arrayProperty.properties as BlockPropertyMap) : {},
        fields.length,
      );
    }
  };

  const removeArrayItem = (index: number) => {
    remove(index);
    if (isComplexArray) {
      removeArrayItemFromSchema(
        inputName,
        index,
        arrayProperty.required,
        fields.length,
      );
    }
  };

  return (
    <ArrayPropertiesProvider
      parentPropertyKey={parentPropertyKey}
      properties={{
        dynamic: enhancedProperties,
        fields: watchedFields,
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {isComplexArray ? (
          <>
            {fields.map((f, index) => {
              const fieldInput = `${inputName}.${index}`;
              return (
                <div
                  className="p-4 border rounded-md flex flex-col gap-4"
                  key={'array-item-' + f.id}
                  data-testid={'arrayPropertiesItem' + index}
                >
                  <div className="flex justify-between">
                    <div className="font-semibold"> #{index + 1}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => removeArrayItem(index)}
                      disabled={disabled}
                    >
                      <TrashIcon
                        className="size-4 text-destructive"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{t('Remove')}</span>
                    </Button>
                  </div>
                  <ArrayFieldContextProvider
                    field={form.getValues(fieldInput) as ArrayItem}
                    inputName={fieldInput}
                  >
                    <AutoPropertiesFormComponent
                      prefixValue={fieldInput}
                      props={arrayProperty.properties!}
                      useMentionTextInput={useMentionTextInput}
                      allowDynamicValues={true}
                      disabled={disabled}
                    ></AutoPropertiesFormComponent>
                  </ArrayFieldContextProvider>
                </div>
              );
            })}
          </>
        ) : (
          <Sortable
            value={fields}
            onMove={({ activeIndex, overIndex }) => {
              move(activeIndex, overIndex);
            }}
            overlay={
              <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2">
                <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
                <div className="h-8 w-full rounded-sm bg-primary/10" />
                <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
              </div>
            }
          >
            {fields.map((field, index) => (
              <SortableItem key={field.id} value={field.id} asChild>
                <div key={field.id} className="flex items-center gap-3">
                  <SortableDragHandle
                    variant="outline"
                    size="icon"
                    disabled={disabled}
                    className="size-8 shrink-0"
                  >
                    <DragHandleDots2Icon
                      className="size-4"
                      aria-hidden="true"
                    />
                  </SortableDragHandle>
                  {arrayProperty.properties && (
                    <div className="flex flex-grow">
                      <AutoPropertiesFormComponent
                        prefixValue={`${inputName}.${index}`}
                        props={arrayProperty.properties}
                        useMentionTextInput={useMentionTextInput}
                        allowDynamicValues={false}
                        disabled={disabled}
                      ></AutoPropertiesFormComponent>
                    </div>
                  )}
                  {!arrayProperty.properties && (
                    <FormField
                      key={`${field.id}.${index}`}
                      control={form.control}
                      name={`${inputName}.${index}`}
                      render={({ field }) => (
                        <FormItem className="grow">
                          <FormControl>
                            {useMentionTextInput ? (
                              <TextInputWithMentions
                                initialValue={field.value}
                                onChange={field.onChange}
                                disabled={disabled}
                              />
                            ) : (
                              <Input
                                value={field.value}
                                onChange={field.onChange}
                                disabled={disabled}
                                className="grow"
                              />
                            )}
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={disabled}
                    className="size-8 shrink-0"
                    onClick={() => {
                      remove(index);
                    }}
                  >
                    <TrashIcon
                      className="size-4 text-destructive"
                      aria-hidden="true"
                    />
                    <span className="sr-only">{t('Remove')}</span>
                  </Button>
                </div>
              </SortableItem>
            ))}
          </Sortable>
        )}
      </div>
      {!disabled && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={appendNewArrayItem}
          type="button"
          data-testid="appendNewArrayItemButton"
        >
          <TextWithIcon icon={<Plus size={18} />} text={t('Add Item')} />
        </Button>
      )}
    </ArrayPropertiesProvider>
  );
};

ArrayBlockProperty.displayName = 'ArrayBlockProperty';
export { ArrayBlockProperty };
