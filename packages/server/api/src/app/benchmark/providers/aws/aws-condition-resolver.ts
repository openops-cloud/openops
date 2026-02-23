import { ApplicationError, ErrorCode } from '@openops/shared';
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
  try {
    const accounts = await getConnectionAccounts(context);
    return accounts.length > 1;
  } catch (err) {
    if (
      err instanceof ApplicationError &&
      err.error.code === ErrorCode.VALIDATION
    ) {
      return false;
    }
    throw err;
  }
}
