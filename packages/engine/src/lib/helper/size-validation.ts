import {
  FlowVersion,
  OpenOpsId,
  StepOutput,
  flowHelper,
} from '@openops/shared';
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

function formatStepSizes(
  steps: Record<string, unknown>,
  flowVersion?: FlowVersion,
): string {
  const stepSizes = Object.entries(steps)
    .map(([stepName, data]) => {
      const displayName = getStepDisplayName(stepName, flowVersion);
      return {
        displayName,
        sizeMB: sizeof(data) / (1024 * 1024),
      };
    })
    .sort((a, b) => b.sizeMB - a.sizeMB);

  return stepSizes
    .map((step) => `  • ${step.displayName}: ${step.sizeMB.toFixed(2)}MB`)
    .join('\n');
}

function getStepDisplayName(
  stepName: string,
  flowVersion?: FlowVersion,
): string {
  if (!flowVersion) {
    return stepName;
  }

  const allSteps = flowHelper.getAllSteps(flowVersion.trigger);
  const step = allSteps.find((s) => s.name === stepName);

  if (step?.displayName) {
    return `${step.displayName} (${step.name})`;
  }

  return stepName;
}

function buildErrorMessage(
  totalSizeMB: number,
  limitMB: number,
  steps?: Record<string, unknown>,
  flowVersion?: FlowVersion,
): string {
  let message = `Workflow output size exceeds maximum allowed size.\n`;
  message += `Total size: ${totalSizeMB.toFixed(2)}MB (limit: ${limitMB.toFixed(
    2,
  )}MB)`;

  if (steps) {
    message += '\n\nStep sizes (largest first):\n';
    message += formatStepSizes(steps, flowVersion);
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
        stepsOrOutput.flowVersion as FlowVersion,
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
