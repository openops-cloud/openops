import {
  BenchmarkWizardOption,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
} from '@openops/shared';
import { throwValidationError } from './errors';
import { getOptionProvider } from './option-provider';
import './register-option-providers';
import {
  getWizardConfig,
  type StaticOptionValue,
  type WizardConfig,
  type WizardConfigStep,
} from './wizard-config-loader';

function getStepProgress(
  config: WizardConfig,
  stepToReturn: WizardConfigStep,
): { totalSteps: number; stepIndex: number } {
  const stepsWithOptions = config.steps.filter((s) => s.optionsSource);
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

function staticValuesToOptions(
  values: StaticOptionValue[],
): BenchmarkWizardOption[] {
  return values.map((v) => ({
    id: v.id,
    displayName: v.displayName,
    ...(v.imageLogoUrl !== undefined && { imageLogoUrl: v.imageLogoUrl }),
  }));
}

async function resolveOptions(
  provider: string,
  step: WizardConfigStep,
  request: BenchmarkWizardRequest,
  projectId: string,
): Promise<BenchmarkWizardOption[]> {
  const optionsSource = step.optionsSource;
  if (!optionsSource) {
    return [];
  }
  if (optionsSource.type === 'static') {
    return staticValuesToOptions(optionsSource.values);
  }
  const context = {
    benchmarkConfiguration: request.benchmarkConfiguration,
    projectId,
    provider,
  };
  const adapter = getOptionProvider(provider);
  return adapter.getOptions(optionsSource.method, context);
}

function computeWizardStepResponse(
  config: WizardConfig,
  currentStepId: string | undefined,
): { stepToShow: WizardConfigStep; nextStep: string | null } {
  const steps = config.steps;
  let stepToShow: WizardConfigStep;

  if (currentStepId) {
    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
    if (currentStepIndex < 0) {
      throwValidationError(`Unknown step: ${currentStepId}`);
    }
    const currentStep = steps[currentStepIndex];
    const nextStepId = resolveNextStepId(currentStep, config);

    if (nextStepId === null) {
      stepToShow = currentStep;
    } else {
      const nextStepDef = steps.find((s) => s.id === nextStepId);
      if (!nextStepDef) {
        throwValidationError(`Next step not found: ${nextStepId}`);
      }
      stepToShow = nextStepDef;
    }
  } else {
    stepToShow = steps[0];
  }

  const nextStep = resolveNextStepId(stepToShow, config);
  return { stepToShow, nextStep };
}

export async function resolveWizardNavigation(
  provider: string,
  request: BenchmarkWizardRequest,
  projectId: string,
): Promise<BenchmarkWizardStepResponse> {
  const normalizedProvider = provider.toLowerCase();
  const config = getWizardConfig(normalizedProvider);

  const { stepToShow, nextStep } = computeWizardStepResponse(
    config,
    request.currentStep,
  );

  const options = await resolveOptions(
    normalizedProvider,
    stepToShow,
    request,
    projectId,
  );

  const { totalSteps, stepIndex } = getStepProgress(config, stepToShow);

  return {
    currentStep: stepToShow.id,
    title: stepToShow.title,
    description: stepToShow.description,
    nextStep,
    selectionType: stepToShow.selectionType,
    options,
    totalSteps,
    stepIndex,
  };
}
