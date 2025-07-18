import { Button, CommandEmpty } from '@openops/components/ui';
import deepEqual from 'fast-deep-equal';
import { t } from 'i18next';
import { useMemo, useState } from 'react';

import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectList,
  MultiSelectSearch,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/app/common/components/multi-select';
import {
  SelectOrClear,
  SelectOrClearChange,
} from '@/app/features/builder/block-properties/select-or-clear/select-or-clear';

type MultiSelectBlockPropertyProps = {
  placeholder: string;
  options: {
    value: unknown;
    label: string;
  }[];
  onChange: (value: unknown[]) => void;
  initialValues?: unknown[];
  disabled?: boolean;
  showDeselect?: boolean;
  showRefresh?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
};

const SELECT_OR_CLEAR_MIN_OPTIONS = 3;

const MultiSelectBlockProperty = ({
  placeholder,
  options,
  onChange,
  disabled,
  initialValues,
  showDeselect,
  showRefresh,
  onRefresh,
  loading,
}: MultiSelectBlockPropertyProps) => {
  const selectClearEnabled = options.length > SELECT_OR_CLEAR_MIN_OPTIONS;
  const [searchTerm, setSearchTerm] = useState('');
  const filteredOptions = useMemo(() => {
    return options
      .map((option, index) => ({
        ...option,
        originalIndex: index,
      }))
      .filter((option) => {
        return option.label.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [options, searchTerm]);

  const selectedIndicies = Array.isArray(initialValues)
    ? initialValues
        .map((value) =>
          options.findIndex((option) => deepEqual(option.value, value)),
        )
        .filter((index) => index > -1)
        .map((index) => String(index))
    : [];

  const sendChanges = (indicides: string[]) => {
    const newSelectedIndicies = indicides.filter(
      (index) => index !== undefined,
    );
    onChange(newSelectedIndicies.map((index) => options[Number(index)].value));
  };

  const onSelectOrClearChanged = (changeType: SelectOrClearChange) => {
    if (changeType === 'selectAll') {
      onChange(options.map((o) => o.value));
    } else {
      onChange([]);
    }
  };

  return !loading ? (
    <MultiSelect
      modal={true}
      value={selectedIndicies}
      onValueChange={sendChanges}
      disabled={disabled}
      onSearch={(searchTerm) => setSearchTerm(searchTerm ?? '')}
    >
      <MultiSelectTrigger
        showDeselect={showDeselect && !disabled}
        onDeselect={() => onChange([])}
        showRefresh={showRefresh && !disabled}
        onRefresh={onRefresh}
      >
        <MultiSelectValue placeholder={placeholder} />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectSearch placeholder={placeholder} />
        {selectClearEnabled && (
          <SelectOrClear
            selectedCount={initialValues?.length || 0}
            totalCount={options.length}
            sendChanges={onSelectOrClearChanged}
          />
        )}
        <MultiSelectList>
          {filteredOptions.map((opt) => (
            <MultiSelectItem
              key={opt.originalIndex}
              value={String(opt.originalIndex)}
            >
              {opt.label}
            </MultiSelectItem>
          ))}
          {filteredOptions.length === 0 && (
            <CommandEmpty>{t('No results found.')}</CommandEmpty>
          )}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  ) : (
    <Button
      variant="outline"
      disabled={disabled}
      role="combobox"
      loading={true}
      className="w-full justify-between w-full"
    ></Button>
  );
};

MultiSelectBlockProperty.displayName = 'MultiSelectBlockProperty';
export { MultiSelectBlockProperty };
