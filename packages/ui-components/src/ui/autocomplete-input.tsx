import { t } from 'i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  ChangeEvent,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type AutocompleteOption = { value: string; label: string };

type AutocompleteInputProps = {
  options: AutocompleteOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean;
  className?: string;
};

const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  (
    {
      options,
      placeholder = 'Select an option...',
      onChange,
      value = '',
      disabled,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [selectValue, setSelectValue] = useState(value);

    useEffect(() => {
      setInputValue(value);
      setSelectValue(value);
    }, [value]);

    const handleSelect = useCallback(
      (currentValue: AutocompleteOption) => {
        setInputValue(currentValue.label);
        setSelectValue(currentValue.value);
        onChange?.(currentValue.value);
        setOpen(false);
      },
      [onChange],
    );

    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        const existingOption = options.find(
          (option) => option.label === newValue,
        );

        if (existingOption) {
          handleSelect(existingOption);
        } else {
          setInputValue(newValue);
          setSelectValue(newValue);
          onChange?.(newValue);
        }
      },
      [handleSelect, onChange, options],
    );

    return (
      <div className={cn('relative w-fit', className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild disabled={disabled}>
            <div className="flex w-full items-center">
              <Input
                ref={ref}
                disabled={disabled}
                value={inputValue}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="w-full text-foreground"
              />
              <Button
                variant="ghost"
                aria-expanded={open}
                disabled={disabled}
                className="absolute right-0 h-full px-3"
                onClick={() => setOpen(!open)}
                tabIndex={-1}
              >
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 text-foreground" />
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command className="bg-background">
              <CommandInput placeholder={placeholder} />
              <CommandList>
                <CommandEmpty>{t('No results found')}</CommandEmpty>
                <CommandGroup className="max-h-60 overflow-auto ">
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectValue === option.value
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

AutocompleteInput.displayName = 'AutocompleteInput';
export { AutocompleteInput };
