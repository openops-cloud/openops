import { FlowVersion, OpenOpsId, StepOutput } from '@openops/shared';
import sizeof from 'object-sizeof';

const MAX_SIZE_FOR_ALL_ENTRIES = 1024 * 1024;

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
        sizeMB: sizeof(data) / (1024 * 1024),
      };
    })
    .sort((a, b) => b.sizeMB - a.sizeMB);

  return stepSizes
    .map((step) => `  • ${step.stepName}: ${step.sizeMB.toFixed(2)}MB`)
    .join('\n');
}

function buildErrorMessage(
  totalSizeMB: number,
  limitMB: number,
  steps?: Record<string, unknown>,
): string {
  let message = `Workflow output size exceeds maximum allowed size.\n`;
  message += `Total size: ${totalSizeMB.toFixed(2)}MB (limit: ${limitMB.toFixed(
    2,
  )}MB)`;

  if (steps) {
    message += '\n\nStep sizes (largest first):\n';
    message += formatStepSizes(steps);
  }

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

  if (outputSize <= MAX_SIZE_FOR_ALL_ENTRIES) {
    return {
      isValid: true,
    };
  }

  const outputSizeMB = outputSize / (1024 * 1024);
  const limitMB = MAX_SIZE_FOR_ALL_ENTRIES / (1024 * 1024);

  if ('stepTestOutputs' in stepsOrOutput && 'flowVersion' in stepsOrOutput) {
    return {
      isValid: false,
      errorMessage: buildErrorMessage(
        outputSizeMB,
        limitMB,
        stepsOrOutput.stepTestOutputs as Record<string, unknown>,
      ),
    };
  }

  return {
    isValid: false,
    errorMessage: buildErrorMessage(
      outputSizeMB,
      limitMB,
      stepsOrOutput as Record<string, unknown>,
    ),
  };
}
