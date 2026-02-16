import {
  BenchmarkWizardOption,
  BenchmarkWizardRequest,
  BenchmarkWizardStepResponse,
} from '@openops/shared';
import { throwValidationError } from './errors';
import {
  getProvider,
  type ProviderAdapter,
  type StaticOptionValue,
  type WizardConfig,
  type WizardConfigStep,
} from './provider-adapter';
import './register-providers';

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

async function resolveNextStepId(
  step: WizardConfigStep,
  config: WizardConfig,
): Promise<string | null> {
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

async function computeWizardStepResponse(
  config: WizardConfig,
  currentStepId: string | undefined,
): Promise<{ stepToShow: WizardConfigStep; nextStep: string | null }> {
  const steps = config.steps;
  let stepToShow: WizardConfigStep;

  if (currentStepId) {
    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
    if (currentStepIndex < 0) {
      throwValidationError(`Unknown step: ${currentStepId}`);
    }
    const currentStep = steps[currentStepIndex];
    const nextStepId = await resolveNextStepId(currentStep, config);

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

  const nextStep = await resolveNextStepId(stepToShow, config);
  return { stepToShow, nextStep };
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
  providerAdapter: ProviderAdapter,
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
    provider: providerAdapter.config.provider,
  };
  return providerAdapter.resolveOptions(optionsSource.method, context);
}

export async function resolveWizardNavigation(
  provider: string,
  request: BenchmarkWizardRequest,
  projectId: string,
): Promise<BenchmarkWizardStepResponse> {
  const normalizedProvider = provider.toLowerCase();
  const providerAdapter = getProvider(normalizedProvider);
  const config = providerAdapter.config;

  const { stepToShow, nextStep } = await computeWizardStepResponse(
    config,
    request.currentStep,
  );

  const options = await resolveOptions(
    providerAdapter,
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
