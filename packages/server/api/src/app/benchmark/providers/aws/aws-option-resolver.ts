import { getRegionsList } from '@openops/common';
import { BenchmarkWizardOption } from '@openops/shared';
import { listConnections } from '../../common-resolvers';
import { throwValidationError } from '../../errors';
import type { WizardContext } from '../../provider-adapter';

export async function resolveOptions(
  method: string,
  context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  switch (method) {
    case 'listConnections':
      return listConnections(context);
    case 'getConnectionAccounts':
      return getConnectionAccounts(context);
    case 'listRegions':
      return listRegions();
    default:
      throwValidationError(`Unknown AWS wizard option method: ${method}`);
  }
}

function listRegions(): BenchmarkWizardOption[] {
  return getRegionsList().map(({ id, displayName }) => ({
    id,
    displayName,
  }));
}

async function getConnectionAccounts(
  _context: WizardContext,
): Promise<BenchmarkWizardOption[]> {
  // TODO: Get selected connection id from context.benchmarkConfiguration?.connection,
  // then call provider-specific API to list accounts for that connection.
  // Returns empty array until we implement the API.
  return [];
}
