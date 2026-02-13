import {
  ApplicationError,
  BenchmarkWizardOption,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
  ErrorCode,
} from '@openops/shared';
import {
  getWizardConfig,
  type WizardConfig,
  type WizardConfigStep,
} from './wizard-config-loader';

function throwValidationError(message: string): never {
  throw new ApplicationError(
    { code: ErrorCode.VALIDATION, params: { message } },
    message,
  );
}

function getStepProgress(
  steps: WizardConfigStep[],
  stepToReturn: WizardConfigStep,
): { totalSteps: number; stepIndex: number } {
  const stepsWithOptions = steps.filter((s) => s.optionsSource);
  const totalSteps = stepsWithOptions.length;
  const stepIndex =
    stepsWithOptions.findIndex((s) => s.id === stepToReturn.id) + 1;
  return { totalSteps, stepIndex };
}

function resolveNextStepId(
  step: WizardConfigStep,
  config: WizardConfig,
): string | null {
  const nextStepId = step.nextStep;
  if (!nextStepId) {
    return null;
  }
  const nextStepDef = config.steps.find((s) => s.id === nextStepId);
  if (!nextStepDef) {
    throwValidationError(`Next step not found: ${nextStepId}`);
  }
  if (nextStepDef.conditional) {
    // TODO: Implement conditional logic
  }
  return nextStepId;
}

function getStepToReturn(
  config: WizardConfig,
  steps: WizardConfigStep[],
  currentStepId: string | undefined,
): WizardConfigStep {
  if (!currentStepId) {
    return steps[0];
  }

  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
  if (currentStepIndex < 0) {
    throwValidationError(`Unknown step: ${currentStepId}`);
  }
  const currentStep = steps[currentStepIndex];
  const nextStepId = resolveNextStepId(currentStep, config);

  if (nextStepId === null) {
    return currentStep;
  }

  const nextStepDef = steps.find((s) => s.id === nextStepId);
  if (!nextStepDef) {
    throwValidationError(`Next step not found: ${nextStepId}`);
  }
  return nextStepDef;
}

export async function getWizardStep(
  provider: string,
  request: BenchmarkWizardRequest,
): Promise<BenchmarkWizardStepResponse> {
  const normalizedProvider = provider.toLowerCase();
  const config = getWizardConfig(normalizedProvider);
  const steps = config.steps;

  const stepToReturn = getStepToReturn(config, steps, request.currentStep);
  const nextStep = resolveNextStepId(stepToReturn, config);

  const options: BenchmarkWizardOption[] = [];

  const { totalSteps, stepIndex } = getStepProgress(steps, stepToReturn);

  return {
    currentStep: stepToReturn.id,
    title: stepToReturn.title,
    description: stepToReturn.description,
    nextStep,
    selectionType: stepToReturn.selectionType,
    options,
    totalSteps,
    stepIndex,
  };
}
