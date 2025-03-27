import { t } from 'i18next';

function formatErrorMessage(errorMessage: string): string {
  if (!errorMessage) {
    return t('Some error occurred...');
  }
  const errorMessagesSplit = errorMessage.split('Error:');
  if (errorMessagesSplit.length < 2) {
    return errorMessage;
  }

  const indentationStep = '  ';
  return errorMessagesSplit.reduce((acc, current, index) => {
    const indentation = indentationStep.repeat(index);
    return `${acc}${indentation}Error ${index + 1}: ${current.trim()}\n`;
  }, '');
}

export const testStepUtils = {
  formatErrorMessage,
};
