import sizeof from 'object-sizeof';

const MAX_SIZE_FOR_ALL_ENTRIES = 50 * 1024;

export type SizeValidationResult = {
  isValid: boolean;
  errorMessage?: string;
  limitInMB: string;
};

function formatStepSizes(steps: Record<string, unknown>): string {
  const stepSizes = Object.entries(steps)
    .map(([name, data]) => ({
      name,
      sizeKB: sizeof(data) / 1024,
    }))
    .sort((a, b) => b.sizeKB - a.sizeKB);

  return stepSizes
    .map((step) => `  • ${step.name}: ${step.sizeKB.toFixed(2)}KB`)
    .join('\n');
}

function buildErrorMessage(
  totalSizeKB: number,
  limitKB: number,
  steps?: Record<string, unknown>,
): string {
  let message = `Workflow output size exceeds maximum allowed size.\n`;
  message += `Total size: ${totalSizeKB.toFixed(2)}KB (limit: ${limitKB}KB)`;

  if (steps) {
    message += '\n\nStep sizes (largest first):\n';
    message += formatStepSizes(steps);
  }

  return message;
}

function isStepsObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isSizeValidationError(errorMessage?: string): boolean {
  return (
    errorMessage?.includes(
      'Workflow output size exceeds maximum allowed size',
    ) ?? false
  );
}

export const validateStepOutputSize = (
  stepsOrOutput: unknown,
): SizeValidationResult => {
  const outputSize = sizeof(stepsOrOutput);
  const limitInMB = (MAX_SIZE_FOR_ALL_ENTRIES / (1024 * 1024)).toFixed(1);

  if (outputSize <= MAX_SIZE_FOR_ALL_ENTRIES) {
    return {
      isValid: true,
      limitInMB,
    };
  }

  const totalSizeKB = outputSize / 1024;
  const limitKB = MAX_SIZE_FOR_ALL_ENTRIES / 1024;
  const steps = isStepsObject(stepsOrOutput) ? stepsOrOutput : undefined;

  return {
    isValid: false,
    errorMessage: buildErrorMessage(totalSizeKB, limitKB, steps),
    limitInMB,
  };
};
