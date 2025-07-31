import { AppSystemProp, system } from '@openops/server-shared';
import { FlowVersion, OpenOpsId, StepOutput } from '@openops/shared';
import sizeof from 'object-sizeof';

const ONE_MB_IN_BYTES = 1024 * 1024;
const MAX_RUN_SIZE_IN_MB =
  system.getNumberOrThrow(AppSystemProp.REQUEST_BODY_LIMIT) - 0.5;

export type SizeValidationResult =
  | {
      isValid: true;
    }
  | {
      isValid: false;
      errorMessage: string;
    };

function formatStepSizes(steps: Record<string, unknown>): string {
  const stepSizes = Object.entries(steps)
    .map(([slug, data]) => {
      const stepName = getStepDisplayName(data);
      const displayName = stepName ? `${slug} (${stepName})` : slug;

      return {
        displayName,
        sizeMB: sizeof(data) / ONE_MB_IN_BYTES,
      };
    })
    .sort((a, b) => b.sizeMB - a.sizeMB);

  return stepSizes
    .map((step) => `  • ${step.displayName}: ${step.sizeMB.toFixed(2)}MB`)
    .join('\n');
}

function getStepDisplayName(stepData: unknown): string | null {
  if (stepData && typeof stepData === 'object' && stepData !== null) {
    const data = stepData as Record<string, unknown>;
    return (data.displayName as string) || (data.name as string) || null;
  }
  return null;
}

function buildErrorMessage(
  totalSizeMB: number,
  steps: Record<string, unknown>,
): string {
  let message = `Workflow output size exceeds maximum allowed size.\n`;
  message += `Total size: ${totalSizeMB.toFixed(2)}MB (limit: ${MAX_RUN_SIZE_IN_MB.toFixed(
    2,
  )}MB)`;

  message += '\n\nStep sizes (largest first):\n';
  message += formatStepSizes(steps);

  return message;
}

export function isSizeValidationError(errorMessage?: string): boolean {
  return (
    errorMessage?.includes(
      'Workflow output size exceeds maximum allowed size',
    ) ?? false
  );
}

export function validateStepOutputSize(
  stepsOrOutput:
    | Record<string, StepOutput>
    | {
        flowVersion: FlowVersion;
        stepTestOutputs: Record<OpenOpsId, unknown>;
      },
): SizeValidationResult {
  const outputSize = sizeof(stepsOrOutput);

  if (outputSize <= MAX_RUN_SIZE_IN_MB * ONE_MB_IN_BYTES) {
    return {
      isValid: true,
    };
  }

  const outputSizeMB = outputSize / ONE_MB_IN_BYTES;
  const steps =
    'stepTestOutputs' in stepsOrOutput
      ? (stepsOrOutput.stepTestOutputs as Record<string, unknown>)
      : (stepsOrOutput as Record<string, unknown>);

  return {
    isValid: false,
    errorMessage: buildErrorMessage(outputSizeMB, steps),
  };
}
