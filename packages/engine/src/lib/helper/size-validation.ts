import sizeof from 'object-sizeof';

const MAX_SIZE_FOR_ALL_ENTRIES = 1024 * 1024;

export type SizeValidationResult = {
  isValid: boolean;
  errorMessage?: string;
  limitInMB: string;
};

export const validateStepOutputSize = (
  output: unknown,
): SizeValidationResult => {
  const outputSize = sizeof(output);
  const limitInMB = (MAX_SIZE_FOR_ALL_ENTRIES / (1024 * 1024)).toFixed(3);

  if (outputSize > MAX_SIZE_FOR_ALL_ENTRIES) {
    return {
      isValid: false,
      errorMessage: `Workflow output size exceeds maximum allowed size (${limitInMB}MB).`,
      limitInMB,
    };
  }

  return {
    isValid: true,
    limitInMB,
  };
};
