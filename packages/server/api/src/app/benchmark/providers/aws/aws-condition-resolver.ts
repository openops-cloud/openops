import { WizardContext } from '@openops/shared';
import { throwValidationError } from '../../errors';
import { getConnectionAccounts } from './aws-option-resolver';

export async function evaluateCondition(
  condition: string,
  context: WizardContext,
): Promise<boolean> {
  switch (condition) {
    case 'hasAnyAccounts':
      return hasAnyAccounts(context);
    default:
      throwValidationError(`Unknown AWS condition method: ${condition}`);
  }
}

async function hasAnyAccounts(context: WizardContext): Promise<boolean> {
  const accounts = await getConnectionAccounts(context);
  return accounts.length >= 1;
}
