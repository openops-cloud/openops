import { throwValidationError } from '../../errors';
import type { WizardContext } from '../../provider-adapter';
import { getConnectionAccounts } from './aws-option-resolver';

export async function evaluateCondition(
  when: string,
  context: WizardContext,
): Promise<boolean> {
  switch (when) {
    case 'hasMultipleAccounts':
      return hasMultipleAccounts(context);
    default:
      throwValidationError(`Unknown AWS conditional method: ${when}`);
  }
}

async function hasMultipleAccounts(context: WizardContext): Promise<boolean> {
  try {
    const accounts = await getConnectionAccounts(context);
    return accounts.length > 1;
  } catch {
    return false;
  }
}
