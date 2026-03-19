import * as React from 'react';

import { cn } from '../../lib/cn';

interface StepValidationFn {
  (): boolean | Promise<boolean>;
}

interface MultiStepFormContextValue {
  currentStep: string;
  steps: string[];
  currentStepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  goToNext: () => Promise<boolean>;
  goToPrevious: () => void;
  goToStep: (step: string) => void;
  setSteps: React.Dispatch<React.SetStateAction<string[]>>;
  registerStepValidation: (step: string, fn: StepValidationFn) => void;
  unregisterStepValidation: (step: string) => void;
}

const MultiStepFormContext =
  React.createContext<MultiStepFormContextValue | null>(null);

export function useMultiStepForm() {
  const context = React.useContext(MultiStepFormContext);
  if (!context) {
    throw new Error('useMultiStepForm must be used within a MultiStepForm');
  }
  return context;
}

interface MultiStepFormProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

const MultiStepForm = React.forwardRef<HTMLDivElement, MultiStepFormProps>(
  (
    { className, value, onValueChange, defaultValue, children, ...props },
    ref,
  ) => {
    const [currentStep, setCurrentStepState] = React.useState(
      value || defaultValue || '',
    );
    const [steps, setSteps] = React.useState<string[]>([]);
    const stepValidationsRef = React.useRef<Map<string, StepValidationFn>>(
      new Map(),
    );

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

    const effectiveStep = value ?? currentStep;
    const currentStepIndex = steps.indexOf(effectiveStep);
    const isFirstStep = currentStepIndex <= 0;
    const isLastStep = currentStepIndex >= steps.length - 1;

    const registerStepValidation = React.useCallback(
      (step: string, fn: StepValidationFn) => {
        stepValidationsRef.current.set(step, fn);
      },
      [],
    );

    const unregisterStepValidation = React.useCallback((step: string) => {
      stepValidationsRef.current.delete(step);
    }, []);

    const goToNext = React.useCallback(async () => {
      const validationFn = stepValidationsRef.current.get(effectiveStep);
      if (validationFn) {
        const isValid = await validationFn();
        if (!isValid) {
          return false;
        }
      }

      const idx = steps.indexOf(effectiveStep);
      if (idx < steps.length - 1) {
        setCurrentStep(steps[idx + 1]);
        return true;
      }
      return false;
    }, [effectiveStep, steps, setCurrentStep]);

    const goToPrevious = React.useCallback(() => {
      const idx = steps.indexOf(effectiveStep);
      if (idx > 0) {
        setCurrentStep(steps[idx - 1]);
      }
    }, [effectiveStep, steps, setCurrentStep]);

    const goToStep = React.useCallback(
      (step: string) => {
        if (steps.includes(step)) {
          setCurrentStep(step);
        }
      },
      [steps, setCurrentStep],
    );

    const contextValue = React.useMemo(
      () => ({
        currentStep: effectiveStep,
        steps,
        currentStepIndex,
        isFirstStep,
        isLastStep,
        goToNext,
        goToPrevious,
        goToStep,
        setSteps,
        registerStepValidation,
        unregisterStepValidation,
      }),
      [
        effectiveStep,
        steps,
        currentStepIndex,
        isFirstStep,
        isLastStep,
        goToNext,
        goToPrevious,
        goToStep,
        registerStepValidation,
        unregisterStepValidation,
      ],
    );

    return (
      <MultiStepFormContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            'relative flex flex-col bg-neutral border border-border shadow-lg h-full',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </MultiStepFormContext.Provider>
    );
  },
);
MultiStepForm.displayName = 'MultiStepForm';

export { MultiStepForm };
export type { MultiStepFormProps };
