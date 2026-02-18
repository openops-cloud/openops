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
  type WizardStepOptionsSource,
} from './provider-adapter';
import './register-providers';

function getStepProgress(
  config: WizardConfig,
  stepToReturn: WizardConfigStep,
): { totalSteps: number; stepIndex: number } {
  const stepsWithOptions = config.steps.filter(
    (s) => s.optionsSource || s.conditional?.onSuccess?.optionsSource,
  );
  const totalSteps = stepsWithOptions.length;
  const stepIndex =
    stepsWithOptions.findIndex((s) => s.id === stepToReturn.id) + 1;
  return { totalSteps, stepIndex };
}

function getNextStepIdFromConfig(
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
  return nextStepId;
}

async function resolveNextStepId(
  nextStepIdFromConfig: string | null,
  config: WizardConfig,
  providerAdapter: ProviderAdapter,
  context: WizardContext,
): Promise<string | null> {
  if (!nextStepIdFromConfig) {
    return null;
  }
  const step = config.steps.find((s) => s.id === nextStepIdFromConfig);
  if (!step) {
    throwValidationError(`Next step not found: ${nextStepIdFromConfig}`);
  }
  if (!step.conditional) {
    return nextStepIdFromConfig;
  }
  const shouldShowStep = await providerAdapter.evaluateConditional(
    step.conditional.when,
    context,
  );
  if (shouldShowStep) {
    return nextStepIdFromConfig;
  }
  const skipToStepId = step.conditional.onFailure?.skipToStep;
  if (!skipToStepId) {
    return nextStepIdFromConfig;
  }
  return resolveNextStepId(skipToStepId, config, providerAdapter, context);
}

async function computeWizardStepResponse(
  config: WizardConfig,
  currentStepId: string | undefined,
  providerAdapter: ProviderAdapter,
  context: WizardContext,
): Promise<{ stepToShow: WizardConfigStep; nextStep: string | null }> {
  const steps = config.steps;
  let stepToShow: WizardConfigStep;

  if (currentStepId) {
    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
    if (currentStepIndex < 0) {
      throwValidationError(`Unknown step: ${currentStepId}`);
    }
    const currentStep = steps[currentStepIndex];
    const nextStepIdFromConfig = getNextStepIdFromConfig(currentStep, config);

    if (nextStepIdFromConfig === null) {
      stepToShow = currentStep;
    } else {
      const resolvedNextStepId = await resolveNextStepId(
        nextStepIdFromConfig,
        config,
        providerAdapter,
        context,
      );
      const nextStepDef = steps.find((s) => s.id === resolvedNextStepId);
      if (!nextStepDef) {
        throwValidationError(`Next step not found: ${resolvedNextStepId}`);
      }
      stepToShow = nextStepDef;
    }
  } else {
    stepToShow = steps[0];
  }

  const nextStepIdFromConfig = getNextStepIdFromConfig(stepToShow, config);
  const nextStep = await resolveNextStepId(
    nextStepIdFromConfig,
    config,
    providerAdapter,
    context,
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
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  const optionsSource =
    step.conditional?.onSuccess?.optionsSource ??
    (step.optionsSource as WizardStepOptionsSource | undefined);
  if (!optionsSource) {
    return [];
  }
  if (optionsSource.type === 'static') {
    return staticValuesToOptions(optionsSource.values);
  }
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
  const context = {
    benchmarkConfiguration: request.benchmarkConfiguration,
    projectId,
    provider: config.provider,
  };

  const { stepToShow, nextStep } = await computeWizardStepResponse(
    config,
    request.currentStep,
    providerAdapter,
    context,
  );

  const options = await resolveOptions(providerAdapter, stepToShow, context);

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
