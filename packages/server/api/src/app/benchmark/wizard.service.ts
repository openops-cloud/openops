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
  const stepsWithOptions = config.steps.filter(
    (s) => s.optionsSource ?? s.conditional?.onSuccess?.optionsSource,
  );
  const totalSteps = stepsWithOptions.length;
  const stepIndex =
    stepsWithOptions.findIndex((s) => s.id === stepToReturn.id) + 1;
  return { totalSteps, stepIndex };
}

async function resolveNextStep(
  step: WizardConfigStep,
  config: WizardConfig,
  context: WizardContext,
  providerAdapter: ProviderAdapter,
): Promise<WizardConfigStep | null> {
  const nextStepId = step.nextStep;
  if (!nextStepId) {
    return null;
  }
  const nextStepDef = config.steps.find((s) => s.id === nextStepId);
  if (!nextStepDef) {
    throwValidationError(`Next step not found: ${nextStepId}`);
  }
  if (!nextStepDef.conditional) {
    return nextStepDef;
  }
  const evaluateCondition = providerAdapter.evaluateCondition;
  if (!evaluateCondition) {
    throwValidationError(
      'Benchmark provider does not support conditional wizard steps',
    );
  }
  const conditionResult = await evaluateCondition(
    nextStepDef.conditional.when,
    context,
  );
  if (conditionResult) {
    return nextStepDef;
  }
  const skipToStepId = nextStepDef.conditional.onFailure?.skipToStep;
  if (!skipToStepId) {
    if (nextStepDef.nextStep) {
      throwValidationError(
        `Conditional step "${nextStepId}" must set onFailure.skipToStep when it is not the last step`,
      );
    }
    return null;
  }
  const skipToStepDef = config.steps.find((s) => s.id === skipToStepId);
  if (!skipToStepDef) {
    throwValidationError(`Next step not found: ${skipToStepId}`);
  }
  return skipToStepDef;
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
    const nextStepDef = await resolveNextStep(
      currentStep,
      config,
      context,
      providerAdapter,
    );
    stepToShow = nextStepDef ?? currentStep;
  } else {
    stepToShow = steps[0];
  }

  const nextStep = stepToShow.nextStep ?? null;
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
  const providerAdapter = getProvider(provider);
  const config = providerAdapter.config;

  const context: WizardContext = {
    benchmarkConfiguration: request.benchmarkConfiguration,
    projectId,
    provider,
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

  if (stepToShow.selectAll && stepToShow.selectionType !== 'multi-select') {
    throwValidationError(
      `Step "${stepToShow.id}" has selectAll: true but selectionType is not "multi-select".`,
    );
  }

  const preselectedOptions =
    stepToShow.selectAll && options.length > 0
      ? options.map((o) => o.id)
      : undefined;

  return {
    currentStep: stepToShow.id,
    title: stepToShow.title,
    description: stepToShow.description,
    nextStep,
    selectionType: stepToShow.selectionType,
    options,
    totalSteps,
    stepIndex,
    preselectedOptions,
  };
}
