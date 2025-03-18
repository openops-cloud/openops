import { Property } from '@openops/blocks-framework';
import { getAzureSubscriptionsStaticDropdown } from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';
import { runCommand } from './azure-cli';
import { getAzureErrorMessage } from './error-helper';

export const useHostSession = Property.DynamicProperties({
  displayName: '',
  required: true,
  refreshers: [],
  props: async () => {
    const enableHostSession = system.getBoolean(
      SharedSystemProp.ENABLE_HOST_SESSION,
    );

    if (!enableHostSession) {
      return {};
    }

    const result: any = {
      useHostSessionCheckbox: Property.Checkbox({
        displayName: 'Use host machine Azure CLI session',
        description: `(Advanced) Uses the host machine's Azure CLI session. Requires 'az login' to have been run on the machine.`,
        required: false,
      }),
    };

    return result;
  },
});

export const subDropdown = Property.DynamicProperties({
  displayName: '',
  required: true,
  refreshers: [
    'auth',
    'useHostSession',
    'useHostSession.useHostSessionCheckbox',
  ],
  props: async ({ auth, useHostSession }) => {
    let subDropdown;
    try {
      if (useHostSession?.['useHostSessionCheckbox'] as unknown as boolean) {
        subDropdown = await getSubscriptionsDropdownForHostSession(auth);
      } else {
        if (!auth) {
          return {
            subDropdown: Property.StaticDropdown({
              displayName: 'Subscriptions',
              description: 'Select a single subscription from the list',
              required: true,
              options: {
                disabled: true,
                options: [],
                placeholder: 'Please authenticate first',
              },
            }),
          };
        }

        subDropdown = await getAzureSubscriptionsStaticDropdown(auth);
      }
    } catch (error) {
      subDropdown = Property.StaticDropdown({
        displayName: 'Subscriptions',
        description: 'Select a single subscription from the list',
        required: true,
        options: {
          disabled: true,
          options: [],
          placeholder: `Something went wrong fetching subscriptions`,
          error: getAzureErrorMessage(error),
        },
      });
    }

    return {
      subDropdown: subDropdown,
    };
  },
});

async function getSubscriptionsDropdownForHostSession(auth: any) {
  const result = await runCommand(
    'account list --only-show-errors',
    auth,
    true,
    undefined,
  );

  const parsedSubscriptions = JSON.parse(result);

  return Property.StaticDropdown({
    displayName: 'Subscriptions',
    description: 'Select a single subscription from the list',
    required: true,
    options: {
      disabled: false,
      options: parsedSubscriptions.map((obj: { id: string; name: string }) => ({
        label: obj.name,
        value: obj.id,
      })),
    },
  });
}
