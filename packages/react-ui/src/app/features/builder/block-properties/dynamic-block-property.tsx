import { BlockPropertyMap } from '@openops/blocks-framework';
import { Skeleton } from '@openops/components/ui';
import { Action, Trigger } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { AutoPropertiesFormComponent } from './auto-properties-form';

import { blocksApi } from '@/app/features/blocks/lib/blocks-api';
import {
  ArrayPropertiesContext,
  ArrayPropsState,
} from '@/app/features/builder/block-properties/dynamic-array/array-properties-context';
import { DynamicArrayProperties } from '@/app/features/builder/block-properties/dynamic-array/types';
import {
  getDynamicInput,
  mapRefreshersToDynamic,
} from '@/app/features/builder/block-properties/dynamic-array/utils';
import { formUtils } from '@/app/features/builder/block-properties/form-utils';
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { useDynamicFormValidationContext } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';

type DynamicPropertiesProps = {
  refreshers: string[];
  propertyName: string;
  disabled: boolean;
  inputName: `settings.input.${string}`;
};
type InputKey = `settings.input.${string}`;

const DynamicProperties = React.memo((props: DynamicPropertiesProps) => {
  const [flowVersion, dynamicPropertiesRefreshCounter] = useBuilderStateContext(
    (state) => [state.flowVersion, state.dynamicPropertiesAuthReconnectCounter],
  );
  const form = useFormContext<Action | Trigger>();
  const arrayContext = useContext<ArrayPropsState | undefined>(
    ArrayPropertiesContext,
  );
  const { updateFormSchema } = useDynamicFormValidationContext();

  const isFirstRender = useRef(true);
  const previousValues = useRef<undefined | unknown[]>(undefined);

  const [propertyMap, setPropertyMap] = useState<BlockPropertyMap | undefined>(
    undefined,
  );
  const newRefreshers = [...props.refreshers];

  const { mutate, isPending } = useMutation<
    BlockPropertyMap,
    Error,
    { input: Record<string, unknown> }
  >({
    mutationFn: async ({ input }) => {
      const { settings } = form.getValues();
      const actionOrTriggerName = settings.actionName ?? settings.triggerName;
      const { blockName, blockVersion, blockType, packageType } = settings;

      const { dynamicPropertyName, dynamicInput } = getDynamicInput(
        props.propertyName,
        props.inputName || '',
        arrayContext,
        settings,
      );

      return blocksApi.options<BlockPropertyMap>({
        blockName,
        blockVersion,
        blockType,
        packageType,
        propertyName: dynamicPropertyName || props.propertyName,
        actionOrTriggerName,
        input: dynamicInput || input,
        flowVersionId: flowVersion.id,
        flowId: flowVersion.flowId,
        stepName: actionOrTriggerName,
      });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const dynamicProperty =
    arrayContext?.properties?.dynamic?.[props.propertyName];
  const allowDynamicValues: Record<string, DynamicArrayProperties> =
    arrayContext?.properties?.dynamic || {};

  const refresh = () => {
    const input: Record<string, unknown> = {};
    newRefreshers.forEach((refresher, index) => {
      input[refresher] = refresherValues[index];
      input.auth = form.getValues('settings.input.auth');
    });

    mutate(
      { input },
      {
        onSuccess: (response) => {
          const currentValue = form.getValues(props.inputName as InputKey);
          const defaultValue = formUtils.getDefaultValueForStep(
            response,
            currentValue ?? {},
          );
          setPropertyMap(response);
          updateFormSchema(props.inputName, response);
          form.setValue(props.inputName as InputKey, defaultValue, {
            shouldValidate: true,
          });
        },
      },
    );
  };

  const refresherValues = mapRefreshersToDynamic(
    newRefreshers,
    dynamicProperty,
    allowDynamicValues,
    props.propertyName,
    props.inputName,
  ).map((input) => form.watch(input));

  useEffect(() => {
    if (
      !isFirstRender.current &&
      !deepEqual(previousValues.current, refresherValues)
    ) {
      // the field state won't be cleared if you only unset the parent prop value
      if (propertyMap)
        Object.keys(propertyMap).forEach((childPropName) => {
          form.setValue(
            `${props.inputName}.${childPropName}` as InputKey,
            null,
            {
              shouldValidate: true,
            },
          );
        });
      form.setValue(props.inputName, null, {
        shouldValidate: true,
      });
    }

    previousValues.current = refresherValues;
    isFirstRender.current = false;

    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refresherValues);

  useEffect(() => {
    if (dynamicPropertiesRefreshCounter > 0) {
      const shouldRefresh = newRefreshers.includes('auth');
      if (shouldRefresh) {
        refresh();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicPropertiesRefreshCounter]);

  return (
    <>
      {isPending && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="w-full h-4" />
          ))}
        </div>
      )}
      {!isPending && propertyMap && (
        <AutoPropertiesFormComponent
          prefixValue={props.inputName}
          props={propertyMap}
          useMentionTextInput={true}
          disabled={props.disabled}
          allowDynamicValues={true}
        ></AutoPropertiesFormComponent>
      )}
    </>
  );
});

DynamicProperties.displayName = 'DynamicProperties';
export { DynamicProperties };
