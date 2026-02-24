import { throwValidationError } from '../../errors';
import type { WizardContext } from '../../provider-adapter';
import { getConnectionAccounts } from './aws-option-resolver';

export async function evaluateCondition(
  condition: string,
  context: WizardContext,
): Promise<boolean> {
  switch (condition) {
    case 'hasMultipleAccounts':
      return hasMultipleAccounts(context);
    default:
      throwValidationError(`Unknown AWS condition method: ${condition}`);
  }
}

async function hasMultipleAccounts(context: WizardContext): Promise<boolean> {
  const accounts = await getConnectionAccounts(context);
  return accounts.length > 1;
}
