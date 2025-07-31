import { AppSystemProp, system } from '@openops/server-shared';
import { FlowVersion, OpenOpsId, StepOutput } from '@openops/shared';
import sizeof from 'object-sizeof';

const ONE_MB_IN_BYTES = 1024 * 1024;
const MAX_RUN_SIZE_IN_MB =
  system.getNumberOrThrow(AppSystemProp.REQUEST_BODY_LIMIT) - 0.5;

const BASE_MESSAGE = 'Workflow output size exceeds maximum allowed size.';

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
    .map(([stepName, data]) => {
      return {
        stepName,
        sizeMB: sizeof(data) / ONE_MB_IN_BYTES,
      };
    })
    .sort((a, b) => b.sizeMB - a.sizeMB);

  return stepSizes
    .map((step) => `  • ${step.stepName}: ${step.sizeMB.toFixed(2)}MB`)
    .join('\n');
}

function buildErrorMessage(
  totalSizeMB: number,
  steps: Record<string, unknown>,
): string {
  let message = `${BASE_MESSAGE}\nTotal size: ${totalSizeMB.toFixed(
    2,
  )}MB (limit: ${MAX_RUN_SIZE_IN_MB.toFixed(2)}MB)`;

  message += '\n\nStep sizes (largest first):\n';
  message += formatStepSizes(steps);

  return message;
}

export function isSizeValidationError(errorMessage?: string): boolean {
  return errorMessage?.includes(BASE_MESSAGE) ?? false;
}

export function validateExecutionSize(
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
    'stepTestOutputs' in stepsOrOutput && 'flowVersion' in stepsOrOutput
      ? stepsOrOutput.stepTestOutputs
      : stepsOrOutput;

  return {
    isValid: false,
    errorMessage: buildErrorMessage(
      outputSizeMB,
      steps as Record<string, unknown>,
    ),
  };
}
