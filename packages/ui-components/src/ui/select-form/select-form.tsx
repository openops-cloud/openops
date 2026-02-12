import * as React from 'react';

import { cn } from '../../lib/cn';
import { RadioGroup } from '../radio-group';

interface SelectFormContextValue {
  type: 'single' | 'multi';
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  disabled?: boolean;
  groupName?: string;
}

const SelectFormContext = React.createContext<SelectFormContextValue | null>(
  null,
);

export function useSelectForm() {
  const context = React.useContext(SelectFormContext);
  if (!context) {
    throw new Error('useSelectForm must be used within a SelectForm');
  }
  return context;
}

interface SingleSelectFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'single';
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
}

interface MultiSelectFormProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'multi';
  value?: string[];
  onValueChange?: (value: string[]) => void;
  defaultValue?: string[];
  disabled?: boolean;
}

type SelectFormProps = SingleSelectFormProps | MultiSelectFormProps;

const SelectForm = React.forwardRef<HTMLDivElement, SelectFormProps>(
  (
    {
      className,
      type,
      value,
      onValueChange,
      defaultValue,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      value || defaultValue || (type === 'single' ? '' : []),
    );
    
    const groupName = React.useId();

    const handleValueChange = React.useCallback(
      (newValue: string | string[]) => {
        if (value === undefined) {
          setInternalValue(newValue);
        }
        onValueChange?.(newValue as any);
      },
      [value, onValueChange],
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    const contextValue = React.useMemo(
      () => ({
        type,
        value: value ?? internalValue,
        onValueChange: handleValueChange,
        disabled,
        groupName,
      }),
      [type, value, internalValue, handleValueChange, disabled, groupName],
    );

    if (type === 'single') {
      return (
        <SelectFormContext.Provider value={contextValue}>
          <RadioGroup
            ref={ref}
            className={cn(
              'space-y-1 border border-border rounded-lg bg-background shadow-sm',
              className,
            )}
            value={contextValue.value as string}
            onValueChange={(val) => handleValueChange(val)}
            disabled={disabled}
            {...props}
          >
            {children}
          </RadioGroup>
        </SelectFormContext.Provider>
      );
    }

    return (
      <SelectFormContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            'space-y-1 border border-border rounded-lg bg-background shadow-sm',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </SelectFormContext.Provider>
    );
  },
);
SelectForm.displayName = 'SelectForm';

export { SelectForm };
