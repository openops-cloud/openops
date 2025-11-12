import { Property } from '@openops/blocks-framework';
import { getAzureSubscriptionsStaticDropdown } from '@openops/common';
import { runCommand } from './azure-cli';
import { getAzureErrorMessage } from './error-helper';

async function fetchSubscriptionsFromHostSession(auth: any) {
  const result = await runCommand(
    'account list --only-show-errors',
    auth,
    true,
    undefined,
  );
  const subscriptions = JSON.parse(result);
  return subscriptions.map((obj: { id: string; name: string }) => ({
    label: obj.name,
    value: obj.id,
  }));
}

export const subDropdown = Property.DynamicProperties({
  displayName: '',
  required: true,
  refreshers: [
    'auth',
    'useHostSession',
    'useHostSession.useHostSessionCheckbox',
  ],
  props: async ({ auth, useHostSession }) => {
    const useHost = useHostSession?.['useHostSessionCheckbox'];

    if (!auth && !useHost) {
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

    try {
      const dropdown = useHost
        ? Property.StaticDropdown({
            displayName: 'Subscriptions',
            description: 'Select a single subscription from the list',
            required: true,
            options: {
              disabled: false,
              options: await fetchSubscriptionsFromHostSession(auth),
            },
          })
        : await getAzureSubscriptionsStaticDropdown(auth);

      return { subDropdown: dropdown };
    } catch (error) {
      return {
        subDropdown: Property.StaticDropdown({
          displayName: 'Subscriptions',
          description: 'Select a single subscription from the list',
          required: true,
          options: {
            disabled: true,
            options: [],
            placeholder: 'Something went wrong fetching subscriptions',
            error: getAzureErrorMessage(error),
          },
        }),
      };
    }
  },
});

export const subMultiSelectDropdown = Property.DynamicProperties({
  displayName: '',
  required: true,
  refreshers: [
    'auth',
    'useHostSession',
    'useHostSession.useHostSessionCheckbox',
  ],
  props: async ({ auth, useHostSession }) => {
    const useHost = useHostSession?.['useHostSessionCheckbox'];

    if (!auth && !useHost) {
      return {
        subMultiSelect: Property.StaticMultiSelectDropdown({
          displayName: 'Subscriptions',
          description: 'Select subscriptions to perform the action on',
          required: false,
          options: {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate first',
          },
        }),
      };
    }

    try {
      const subscriptions = useHost
        ? await fetchSubscriptionsFromHostSession(auth)
        : (await getAzureSubscriptionsStaticDropdown(auth)).options;

      return {
        subMultiSelect: Property.StaticMultiSelectDropdown({
          displayName: 'Subscriptions',
          description: 'Select subscriptions to perform the action on',
          required: false,
          options: {
            disabled: false,
            options: subscriptions,
          },
        }),
      };
    } catch (error) {
      return {
        subMultiSelect: Property.StaticMultiSelectDropdown({
          displayName: 'Subscriptions',
          description: 'Select subscriptions to perform the action on',
          required: false,
          options: {
            disabled: true,
            options: [],
            placeholder: 'Something went wrong fetching subscriptions',
            error: getAzureErrorMessage(error),
          },
        }),
      };
    }
  },
});

export async function getSubscriptionsDropdownForHostSession(auth: any) {
  try {
    return Property.StaticDropdown({
      displayName: 'Subscriptions',
      description: 'Select a single subscription from the list',
      required: true,
      options: {
        disabled: false,
        options: await fetchSubscriptionsFromHostSession(auth),
      },
    });
  } catch (error) {
    return Property.StaticDropdown({
      displayName: 'Subscriptions',
      description: 'Select a single subscription from the list',
      required: true,
      options: {
        disabled: true,
        options: [],
        placeholder: 'Something went wrong fetching subscriptions',
        error: `${error}`,
      },
    });
  }
}

export async function getSubscriptionsMultiSelectForHostSession(auth: any) {
  try {
    return Property.StaticMultiSelectDropdown({
      displayName: 'Subscriptions',
      description: 'Select subscriptions to perform the action on',
      required: false,
      options: {
        disabled: false,
        options: await fetchSubscriptionsFromHostSession(auth),
      },
    });
  } catch (error) {
    return Property.StaticMultiSelectDropdown({
      displayName: 'Subscriptions',
      description: 'Select subscriptions to perform the action on',
      required: false,
      options: {
        disabled: true,
        options: [],
        placeholder: 'Something went wrong fetching subscriptions',
        error: `${error}`,
      },
    });
  }
}
