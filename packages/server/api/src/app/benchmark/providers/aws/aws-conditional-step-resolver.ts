import { throwValidationError } from '../../errors';
import type { WizardContext } from '../../provider-adapter';

export async function evaluateConditional(
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

async function hasMultipleAccounts(_context: WizardContext): Promise<boolean> {
  // TODO: Evaluate from connection (e.g. roles.length > 1) and return false when no connection in context. For now always show the accounts step.
  return true;
}
