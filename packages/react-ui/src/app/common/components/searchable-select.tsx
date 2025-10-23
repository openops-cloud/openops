import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from '@openops/components/ui';
import deepEqual from 'fast-deep-equal';
import { t } from 'i18next';
import { Check, ChevronsUpDown, RefreshCcw, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { SelectUtilButton } from '@/app/common/components/select-util-button';

type SelectOption<T> = {
  value: T;
  label: string;
  description?: string;
};

type SearchableSelectProps<T> = {
  options: SelectOption<T>[];
  onChange: (value: T | null) => void;
  value: T | undefined;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  showDeselect?: boolean;
  onRefresh?: () => void;
  showRefresh?: boolean;
  className?: string;
  customDropdownAction?: React.ReactNode;
  onCustomDropdownActionSelect?: () => void;
};

export const SearchableSelect = <T extends React.Key>({
  options,
  onChange,
  value,
  placeholder,
  disabled,
  loading,
  showDeselect,
  onRefresh,
  showRefresh,
  className,
  customDropdownAction,
  onCustomDropdownActionSelect,
}: SearchableSelectProps<T>) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [filterOptionsIndices, setFilteredOptions] = useState<number[]>([]);
  const triggerWidth = `${triggerRef.current?.clientWidth ?? 0}px`;

  const getSelectedOptionIndex = (
    options: SelectOption<T>[],
    value: T | undefined,
  ) => {
    return options.findIndex((option) => deepEqual(option.value, value)) ?? -1;
  };

  const [selectedIndex, setSelectedIndex] = useState(
    getSelectedOptionIndex(options, value),
  );

  useEffect(() => {
    setSelectedIndex(getSelectedOptionIndex(options, value));
  }, [value, options]);

  useEffect(() => {
    if (!open && searchTerm) {
      setSearchTerm('');
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.length === 0) {
      setFilteredOptions(options.map((_, index) => index));
    } else {
      const filteredOptions = options
        .map((option, index) => {
          return {
            label: option.label,
            value: option.value,
            index: index,
            description: option.description ?? '',
          };
        })
        .filter((option) => {
          return (
            option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            option.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
      setFilteredOptions(filteredOptions.map((op) => op.index));
    }
  }, [searchTerm, options]);

  const onSelect = (index: string) => {
    const optionIndex =
      Number.isInteger(parseInt(index)) && !Number.isNaN(parseInt(index))
        ? parseInt(index)
        : -1;
    setSelectedIndex(optionIndex);
    setSearchTerm('');

    if (optionIndex === -1) {
      return;
    }
    const option = options[optionIndex];
    onChange(option.value);
  };
  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        className={cn('', {
          'cursor-not-allowed opacity-80 ': disabled,
        })}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
          }
          e.stopPropagation();
        }}
      >
        <div className={cn('relative', className)}>
          <Button
            ref={triggerRef}
            variant="outline"
            disabled={disabled}
            role="combobox"
            loading={loading}
            aria-expanded={open}
            className="w-full justify-between"
            onClick={(e) => {
              setOpen((prev) => !prev);
              e.preventDefault();
            }}
            data-testid="searchableSelectTrigger"
          >
            <span
              className={cn('w-full text-start truncate select-none', {
                'mr-8': showRefresh,
              })}
            >
              {selectedIndex > -1 && options[selectedIndex]
                ? options[selectedIndex].label
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          <div className="right-10 top-2 absolute flex gap-2  z-50 items-center">
            {showDeselect && !disabled && value && !loading && (
              <SelectUtilButton
                tooltipText={t('Unset')}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(null);
                }}
                Icon={X}
              ></SelectUtilButton>
            )}
            {showRefresh && !loading && (
              <SelectUtilButton
                tooltipText={t('Refresh')}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onRefresh) {
                    onRefresh();
                  }
                }}
                Icon={RefreshCcw}
              ></SelectUtilButton>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        style={{
          maxWidth: triggerWidth,
          minWidth: triggerWidth,
        }}
        className="min-w-full w-full p-0"
        data-testid="searchableSelectContent"
      >
        <Command className="w-full" shouldFilter={false}>
          <CommandInput
            placeholder={t(placeholder)}
            value={searchTerm}
            onValueChange={(e) => {
              setSearchTerm(e);
            }}
            data-testid="searchableSelectInput"
          />
          {filterOptionsIndices.length === 0 && (
            <CommandEmpty>{t('No results found.')}</CommandEmpty>
          )}

          <CommandGroup>
            <CommandList>
              <ScrollArea
                className="h-full"
                viewPortClassName={'max-h-[200px]'}
              >
                {customDropdownAction && (
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      onCustomDropdownActionSelect?.();
                    }}
                  >
                    {customDropdownAction}
                  </CommandItem>
                )}
                {filterOptionsIndices &&
                  filterOptionsIndices.map((filterIndex) => {
                    const option = options[filterIndex];
                    if (!option) {
                      return null;
                    }
                    return (
                      <CommandItem
                        key={filterIndex}
                        value={String(filterIndex)}
                        onSelect={(currentValue) => {
                          setOpen(false);
                          onSelect(currentValue);
                        }}
                        className="flex gap-2 flex-col items-start"
                        data-testid="searchableSelectOption"
                      >
                        <div className="flex gap-2 items-center">
                          <Check
                            className={cn('flex-shrink-0 w-4 h-4', {
                              hidden: selectedIndex !== filterIndex,
                            })}
                          />
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-sm text-muted-foreground">
                            {option.description}
                          </div>
                        )}
                      </CommandItem>
                    );
                  })}
              </ScrollArea>
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

SearchableSelect.displayName = 'SearchableSelect';
