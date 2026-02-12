import {
  ApplicationError,
  BenchmarkWizardOption,
  BenchmarkWizardStepResponse,
  ErrorCode,
} from '@openops/shared';
import {
  getWizardConfig,
  SUPPORTED_WIZARD_PROVIDERS,
  type WizardConfig,
  type WizardConfigStep,
} from './wizard-config-loader';
import {
  resolveListConnectionsOptions,
  resolveStaticOptions,
} from './wizard-option-resolvers';

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
    return null;
  }
  if (nextStepDef.action) {
    return null;
  }
  if (nextStepDef.conditional) {
    return nextStepDef.conditional.skipToStep ?? nextStepId;
  }
  return nextStepId;
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
  if (!SUPPORTED_WIZARD_PROVIDERS.has(provider)) {
    const message = `Unsupported wizard provider: ${provider}`;
    throw new ApplicationError(
      { code: ErrorCode.VALIDATION, params: { message } },
      message,
    );
  }

  const config = getWizardConfig(provider);
  const steps = config.steps;
  const currentStepId = request.currentStep;
  const benchmarkConfiguration = request.benchmarkConfiguration ?? {};

  let stepToReturn: WizardConfigStep;
  let nextStep: string | null;

  if (currentStepId) {
    const currentStepIndex = steps.findIndex((s) => s.id === currentStepId);
    if (currentStepIndex < 0) {
      const message = `Unknown step: ${currentStepId}`;
      throw new ApplicationError(
        { code: ErrorCode.VALIDATION, params: { message } },
        message,
      );
    }
    const currentStep = steps[currentStepIndex];
    const nextStepId = resolveNextStep(
      currentStep,
      config,
      benchmarkConfiguration,
    );
    if (nextStepId === null) {
      stepToReturn = currentStep;
      nextStep = null;
    } else {
      const nextStepDef = steps.find((s) => s.id === nextStepId);
      if (!nextStepDef) {
        const message = `Next step not found: ${nextStepId}`;
        throw new ApplicationError(
          { code: ErrorCode.VALIDATION, params: { message } },
          message,
        );
      }
      stepToReturn = nextStepDef;
      nextStep = resolveNextStep(stepToReturn, config, benchmarkConfiguration);
    }
  } else {
    stepToReturn = steps[0];
    nextStep = resolveNextStep(stepToReturn, config, benchmarkConfiguration);
  }

  const options = await resolveOptionsForStep(
    stepToReturn,
    provider,
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
