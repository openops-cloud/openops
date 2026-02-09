import {
  AppConnectionStatus,
  BenchmarkWizardOption,
  BenchmarkWizardStepResponse,
} from '@openops/shared';
import { appConnectionService } from '../app-connection/app-connection-service/app-connection-service';
import { removeSensitiveData } from '../app-connection/app-connection-utils';
import {
  getWizardConfig,
  type StaticOptionValue,
  type WizardConfig,
  type WizardConfigStep,
} from './wizard-config-loader';

const SUPPORTED_PROVIDERS = ['aws'] as const;

function resolveNextStep(
  step: WizardConfigStep,
  _answers: Record<string, string[]>,
  config: WizardConfig,
): string | null {
  const next = step.nextStep;
  if (!next) {
    return null;
  }
  const nextStepDef = config.steps.find((s) => s.id === next);
  if (!nextStepDef) {
    return null;
  }
  if (nextStepDef.action) {
    return null;
  }
  // Skip accounts step (getConnectionAccounts not implemented)
  if (next === 'accounts') {
    return nextStepDef.conditional?.skipToStep ?? 'regions';
  }
  return next;
}

function staticValuesToOptions(
  values: StaticOptionValue[],
): BenchmarkWizardOption[] {
  return values.map((v) => ({
    id: v.id,
    name: v.displayName ?? v.id,
    imageLogoUrl: v.icon || undefined,
    metadata: v.type ? { type: v.type } : undefined,
  }));
}

async function resolveOptionsForStep(
  step: WizardConfigStep,
  provider: string,
  projectId: string,
): Promise<BenchmarkWizardOption[]> {
  const source = step.optionsSource;
  if (!source) {
    return [];
  }
  if (source.type === 'static' && source.values) {
    return staticValuesToOptions(source.values);
  }
  if (source.type === 'dynamic' && source.method === 'listConnections') {
    const authProvider = provider.toLowerCase();
    const page = await appConnectionService.list({
      projectId,
      cursorRequest: null,
      name: undefined,
      status: [AppConnectionStatus.ACTIVE],
      limit: 100,
      authProviders: [authProvider],
    });
    return page.data.map((conn) => {
      const safe = removeSensitiveData(conn);
      return {
        id: safe.id,
        name: safe.name,
        imageLogoUrl: undefined,
        metadata: { authProviderKey: safe.authProviderKey },
      };
    });
  }
  // getConnectionAccounts not implemented; accounts step is skipped via conditional
  return [];
}

export async function getWizardStep(
  provider: string,
  request: { currentStep?: string; answers?: Record<string, string[]> },
  projectId: string,
): Promise<BenchmarkWizardStepResponse> {
  if (
    !SUPPORTED_PROVIDERS.includes(
      provider as (typeof SUPPORTED_PROVIDERS)[number],
    )
  ) {
    throw new Error(`Unsupported wizard provider: ${provider}`);
  }
  const config = getWizardConfig(provider);
  const steps = config.steps;
  const answers = request.answers ?? {};
  const currentStepId = request.currentStep;

  let stepToReturn: WizardConfigStep;
  let nextStep: string | null;

  if (!currentStepId) {
    // First call: return first step (connection)
    stepToReturn = steps[0];
    nextStep = resolveNextStep(stepToReturn, answers, config);
  } else {
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);
    if (currentIndex < 0) {
      throw new Error(`Unknown step: ${currentStepId}`);
    }
    const currentStep = steps[currentIndex];
    const resolvedNext = resolveNextStep(currentStep, answers, config);
    if (resolvedNext === null) {
      // User just completed the last selection step (services); return same step with nextStep: null
      stepToReturn = currentStep;
      nextStep = null;
    } else {
      // Return the next step
      const nextStepDef = steps.find((s) => s.id === resolvedNext);
      if (!nextStepDef) {
        throw new Error(`Next step not found: ${resolvedNext}`);
      }
      stepToReturn = nextStepDef;
      nextStep = resolveNextStep(stepToReturn, answers, config);
    }
  }

  const options = await resolveOptionsForStep(
    stepToReturn,
    provider,
    projectId,
  );

  return {
    currentStep: stepToReturn.id,
    title: stepToReturn.title,
    description: stepToReturn.description,
    nextStep,
    selectionType: stepToReturn.selectionType,
    options,
  };
}
