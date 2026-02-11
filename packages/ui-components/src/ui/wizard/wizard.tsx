import * as React from 'react';

import { cn } from '../../lib/cn';

interface WizardContextValue {
  currentStep: string;
  setCurrentStep: (step: string) => void;
  totalSteps: number;
  setTotalSteps: (total: number) => void;
  steps: string[];
  setSteps: React.Dispatch<React.SetStateAction<string[]>>;
}

const WizardContext = React.createContext<WizardContextValue | null>(null);

export function useWizard() {
  const context = React.useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a Wizard');
  }
  return context;
}

interface WizardProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

const Wizard = React.forwardRef<HTMLDivElement, WizardProps>(
  (
    { className, value, onValueChange, defaultValue, children, ...props },
    ref,
  ) => {
    const [currentStep, setCurrentStepState] = React.useState(
      value || defaultValue || '',
    );
    const [totalSteps, setTotalSteps] = React.useState(0);
    const [steps, setSteps] = React.useState<string[]>([]);

    const setCurrentStep = React.useCallback(
      (step: string) => {
        if (value === undefined) {
          setCurrentStepState(step);
        }
        onValueChange?.(step);
      },
      [value, onValueChange],
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setCurrentStepState(value);
      }
    }, [value]);

    const contextValue = React.useMemo(
      () => ({
        currentStep: value ?? currentStep,
        setCurrentStep,
        totalSteps,
        setTotalSteps,
        steps,
        setSteps,
      }),
      [value, currentStep, setCurrentStep, totalSteps, steps],
    );

    return (
      <WizardContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            'relative flex flex-col bg-background border border-border rounded-lg shadow-lg',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </WizardContext.Provider>
    );
  },
);
Wizard.displayName = 'Wizard';

export { Wizard };
