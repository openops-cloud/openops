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
  type WizardContext,
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
  // This should be fixed to include the conditional steps as well
}

async function resolveNextStepId(
  step: WizardConfigStep,
  config: WizardConfig,
  context: WizardContext,
  providerAdapter: ProviderAdapter,
): Promise<string | null> {
  let nextStepId = step.nextStep;
  if (!nextStepId) {
    return null;
  }
  const visitedSteps = new Set<string>();
  while (nextStepId) {
    if (visitedSteps.has(nextStepId)) {
      throwValidationError(`Circular reference detected: ${nextStepId}`);
    }
    visitedSteps.add(nextStepId);
    const nextStepDef = config.steps.find((s) => s.id === nextStepId);
    if (!nextStepDef) {
      throwValidationError(`Next step not found: ${nextStepId}`);
    }
    if (!nextStepDef.conditional) {
      return nextStepId;
    }
    const conditionResult = await providerAdapter.evaluateCondition(
      nextStepDef.conditional.when,
      context,
    );
    if (conditionResult) {
      return nextStepId;
    }
    const skipToStepId = nextStepDef.conditional.onFailure?.skipToStep;
    if (!skipToStepId) {
      return null;
    }
    nextStepId = skipToStepId;
  }
  return null;
}

async function computeWizardStepResponse(
  config: WizardConfig,
  currentStepId: string | undefined,
  context: WizardContext,
  providerAdapter: ProviderAdapter,
): Promise<{ stepToShow: WizardConfigStep; nextStep: string | null }> {
  const steps = config.steps;
  let stepToShow: WizardConfigStep;

  if (currentStepId) {
    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
    if (currentStepIndex < 0) {
      throwValidationError(`Unknown step: ${currentStepId}`);
    }
    const currentStep = steps[currentStepIndex];
    const nextStepId = await resolveNextStepId(
      currentStep,
      config,
      context,
      providerAdapter,
    );

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

  const nextStep = await resolveNextStepId(
    stepToShow,
    config,
    context,
    providerAdapter,
  );
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
  const optionsSource =
    step.conditional?.onSuccess?.optionsSource ?? step.optionsSource;
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

  const context: WizardContext = {
    benchmarkConfiguration: request.benchmarkConfiguration,
    projectId,
    provider: normalizedProvider,
  };

  const { stepToShow, nextStep } = await computeWizardStepResponse(
    config,
    request.currentStep,
    context,
    providerAdapter,
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
