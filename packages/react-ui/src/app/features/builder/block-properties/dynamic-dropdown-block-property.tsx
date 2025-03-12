import { useMutation } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import { t } from 'i18next';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { SearchableSelect } from '@/app/common/components/searchable-select';
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
import { useBuilderStateContext } from '@/app/features/builder/builder-hooks';
import { DropdownState } from '@openops/blocks-framework';
import { Action, Trigger, isNil } from '@openops/shared';

import { AlertError } from './alert-error';
import { MultiSelectBlockProperty } from './multi-select-block-property';

type SelectBlockPropertyProps = {
  refreshers: string[];
  propertyName: string;
  value?: unknown;
  multiple?: boolean;
  disabled: boolean;
  onChange: (value: unknown | undefined) => void;
  showDeselect?: boolean;
  inputName: string;
};
const DynamicDropdownBlockProperty = React.memo(
  (props: SelectBlockPropertyProps) => {
    const [flowVersion, dynamicPropertiesRefreshCounter] =
      useBuilderStateContext((state) => [
        state.flowVersion,
        state.dynamicPropertiesAuthReconnectCounter,
      ]);
    const form = useFormContext<Action | Trigger>();
    const arrayContext = useContext<ArrayPropsState | undefined>(
      ArrayPropertiesContext,
    );

    const isFirstRender = useRef(true);
    const previousValues = useRef<undefined | unknown[]>(undefined);

    const newRefreshers = [...props.refreshers];
    const [dropdownState, setDropdownState] = useState<DropdownState<unknown>>({
      disabled: false,
      placeholder: t('Select an option'),
      options: [],
    });

    const { mutate, isPending } = useMutation<
      DropdownState<unknown>,
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

        return blocksApi.options<DropdownState<unknown>>({
          blockName,
          blockVersion,
          blockType,
          packageType,
          propertyName: dynamicPropertyName || props.propertyName,
          actionOrTriggerName: actionOrTriggerName,
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

    const refresherValues = mapRefreshersToDynamic(
      newRefreshers,
      dynamicProperty,
      allowDynamicValues,
      props.propertyName,
      props.inputName,
    ).map((input) => form.watch(input));

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
            setDropdownState(response);
          },
        },
      );
    };

    useEffect(() => {
      if (
        !isFirstRender.current &&
        !deepEqual(previousValues.current, refresherValues)
      ) {
        props.onChange(null);
      }

      previousValues.current = refresherValues;
      isFirstRender.current = false;
      refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, refresherValues);

    useEffect(() => {
      if (
        dynamicPropertiesRefreshCounter > 0 &&
        newRefreshers.includes('auth')
      ) {
        refresh();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dynamicPropertiesRefreshCounter]);

    const selectOptions =
      dropdownState.options?.map((option) => ({
        label: option.label,
        value: option.value as React.Key,
      })) || [];

    return props.multiple ? (
      <>
        <MultiSelectBlockProperty
          placeholder={dropdownState.placeholder ?? t('Select an option')}
          options={selectOptions}
          loading={isPending}
          onChange={(value) => props.onChange(value)}
          disabled={dropdownState.disabled || props.disabled}
          initialValues={props.value as unknown[]}
          showDeselect={
            props.showDeselect &&
            !isNil(props.value) &&
            Array.isArray(props.value) &&
            props.value.length > 0 &&
            !props.disabled &&
            !dropdownState.disabled
          }
          showRefresh={!props.disabled && !dropdownState.disabled}
          onRefresh={refresh}
        />
        {dropdownState.error && (
          <AlertError error={dropdownState.error} className="mt-2" />
        )}
      </>
    ) : (
      <>
        <SearchableSelect
          options={selectOptions}
          disabled={dropdownState.disabled || props.disabled}
          loading={isPending}
          placeholder={dropdownState.placeholder ?? t('Select an option')}
          value={props.value as React.Key}
          onChange={(value) => props.onChange(value)}
          showDeselect={
            props.showDeselect && !isNil(props.value) && !props.disabled
          }
          onRefresh={refresh}
          showRefresh={!props.disabled && !dropdownState.disabled}
        />
        {dropdownState.error && (
          <AlertError error={dropdownState.error} className="mt-2" />
        )}
      </>
    );
  },
);

DynamicDropdownBlockProperty.displayName = 'DynamicDropdownBlockProperty';
export { DynamicDropdownBlockProperty };
