import {
  ApplicationError,
  BenchmarkWizardOption,
  BenchmarkWizardStepResponse,
  ErrorCode,
} from '@openops/shared';
import {
  getWizardConfig,
  type WizardConfig,
  type WizardConfigStep,
} from './wizard-config-loader';
import {
  resolveListConnectionsOptions,
  resolveStaticOptions,
} from './wizard-option-resolvers';

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

function resolveNextStep(
  step: WizardConfigStep,
  config: WizardConfig,
  _benchmarkConfiguration: Record<string, string[]>,
): string | null {
  const nextStepId = step.nextStep;
  if (!nextStepId) {
    return null;
  }
  const nextStepDef = config.steps.find((s) => s.id === nextStepId);
  if (!nextStepDef) {
    throwValidationError(`Next step not found: ${nextStepId}`);
  }
  if (nextStepDef.action) {
    return null;
  }
  if (nextStepDef.conditional) {
    return nextStepDef.conditional.skipToStep ?? nextStepId;
  }
  return nextStepId;
}

function resolveStepToReturnAndNextStep(
  config: WizardConfig,
  steps: WizardConfigStep[],
  currentStepId: string | undefined,
  benchmarkConfiguration: Record<string, string[]>,
): { stepToReturn: WizardConfigStep; nextStep: string | null } {
  if (!currentStepId) {
    const stepToReturn = steps[0];
    const nextStep = resolveNextStep(
      stepToReturn,
      config,
      benchmarkConfiguration,
    );
    return { stepToReturn, nextStep };
  }

  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
  if (currentStepIndex < 0) {
    throwValidationError(`Unknown step: ${currentStepId}`);
  }
  const currentStep = steps[currentStepIndex];
  const nextStepId = resolveNextStep(
    currentStep,
    config,
    benchmarkConfiguration,
  );

  if (nextStepId === null) {
    return { stepToReturn: currentStep, nextStep: null };
  }

  const nextStepDef = steps.find((s) => s.id === nextStepId);
  if (!nextStepDef) {
    throwValidationError(`Next step not found: ${nextStepId}`);
  }
  const nextStep = resolveNextStep(nextStepDef, config, benchmarkConfiguration);
  return { stepToReturn: nextStepDef, nextStep };
}

async function resolveOptionsForStep(
  step: WizardConfigStep,
  provider: string,
  projectId: string,
  _benchmarkConfiguration?: Record<string, string[]>,
): Promise<BenchmarkWizardOption[]> {
  const source = step.optionsSource;
  if (!source) {
    return [];
  }
  if (source.type === 'static' && source.values) {
    return resolveStaticOptions(source.values);
  }
  if (source.type === 'dynamic' && source.method === 'listConnections') {
    return resolveListConnectionsOptions(provider, projectId);
  }
  return [];
}

export async function getWizardStep(
  provider: string,
  request: {
    currentStep?: string;
    benchmarkConfiguration?: Record<string, string[]>;
  },
  projectId: string,
): Promise<BenchmarkWizardStepResponse> {
  const normalizedProvider = provider.toLowerCase();
  const config = getWizardConfig(normalizedProvider);
  const steps = config.steps;
  const benchmarkConfiguration = request.benchmarkConfiguration ?? {};

  const { stepToReturn, nextStep } = resolveStepToReturnAndNextStep(
    config,
    steps,
    request.currentStep,
    benchmarkConfiguration,
  );

  const options = await resolveOptionsForStep(
    stepToReturn,
    normalizedProvider,
    projectId,
    request.benchmarkConfiguration,
  );

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
