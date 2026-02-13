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
  (props, ref) => {
    const {
      className,
      type,
      value,
      onValueChange,
      defaultValue,
      disabled,
      children,
      ...divProps
    } = props;

    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      value || defaultValue || (type === 'single' ? '' : []),
    );

    const groupName = React.useId();

    const handleValueChange = React.useCallback(
      (newValue: string | string[]) => {
        if (value === undefined) {
          setInternalValue(newValue);
        }
        if (props.type === 'single' && typeof newValue === 'string') {
          props.onValueChange?.(newValue);
        } else if (props.type === 'multi' && Array.isArray(newValue)) {
          props.onValueChange?.(newValue);
        }
      },
      [value, props],
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

    const currentValue = value ?? internalValue;

    if (type === 'single') {
      const radioValue = typeof currentValue === 'string' ? currentValue : '';
      return (
        <SelectFormContext.Provider value={contextValue}>
          <RadioGroup
            ref={ref}
            className={cn(
              'gap-0 space-y-1 rounded-lg bg-background shadow-sm',
              className,
            )}
            value={radioValue}
            onValueChange={(val) => handleValueChange(val)}
            disabled={disabled}
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
            'gap-0 space-y-1 rounded-lg bg-background shadow-sm',
            className,
          )}
          {...divProps}
        >
          {children}
        </div>
      </SelectFormContext.Provider>
    );
  },
);
SelectForm.displayName = 'SelectForm';

export { SelectForm };
