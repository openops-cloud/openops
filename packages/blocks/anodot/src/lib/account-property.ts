import { DropdownState, Property } from '@openops/blocks-framework';
import { createUmbrellaSession, UmbrellaAuthProps } from './common/auth';
import { listUmbrellaAccounts } from './common/umbrella-accounts';

export function accountProperty() {
  return Property.MultiSelectDropdown({
    displayName: 'Accounts',
    description: 'A list of available Umbrella accounts',
    refreshers: ['auth'],
    required: true,
    options: async ({ auth }: any) => {
      return getAccountDropdownState(auth);
    },
  });
}

export function accountSingleSelectProperty() {
  return Property.Dropdown({
    displayName: 'Account',
    description: 'A list of available Umbrella accounts',
    refreshers: ['auth'],
    required: true,
    options: async ({ auth }: any) => {
      return getAccountDropdownState(auth);
    },
  });
}

async function getAccountDropdownState(
  auth: UmbrellaAuthProps | undefined,
): Promise<DropdownState<unknown>> {
  if (!auth) {
    return {
      disabled: true,
      options: [],
      placeholder: 'Please authenticate first',
    };
  }

  try {
    const session = await createUmbrellaSession(auth);
    const accounts = await listUmbrellaAccounts(session);

    if (accounts.length === 0) {
      return {
        disabled: true,
        options: [],
        placeholder: 'No user accounts found in Umbrella.',
      };
    }

    return {
      disabled: false,
      options: accounts.map((account) => ({
        label: account.accountName,
        value: account,
      })),
    };
  } catch (error) {
    return {
      disabled: true,
      error: (error as Error).message,
      options: [],
      placeholder: 'Could not fetch Umbrella user accounts',
    } as DropdownState<unknown>;
  }
}
