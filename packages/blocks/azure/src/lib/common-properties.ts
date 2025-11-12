import { Property } from '@openops/blocks-framework';
import { getAzureSubscriptionsStaticDropdown } from '@openops/common';
import { runCommand } from './azure-cli';
import { getAzureErrorMessage } from './error-helper';

interface SubscriptionDropdownConfig {
  displayName: string;
  description: string;
  required: boolean;
  multiSelect: boolean;
}

const SINGLE_SELECT_CONFIG: SubscriptionDropdownConfig = {
  displayName: 'Subscriptions',
  description: 'Select a single subscription from the list',
  required: true,
  multiSelect: false,
};

const MULTI_SELECT_CONFIG: SubscriptionDropdownConfig = {
  displayName: 'Query Subscriptions',
  description:
    'Select subscriptions to query. Leave empty to query all accessible subscriptions.',
  required: false,
  multiSelect: true,
};

async function fetchSubscriptionsFromHostSession(auth: any) {
  const result = await runCommand(
    'account list --only-show-errors',
    auth,
    true,
    undefined,
  );
  return JSON.parse(result);
}

function createSubscriptionDropdown(
  config: SubscriptionDropdownConfig,
  options: any,
) {
  const PropertyType = config.multiSelect
    ? Property.StaticMultiSelectDropdown
    : Property.StaticDropdown;

  return PropertyType({
    displayName: config.displayName,
    description: config.description,
    required: config.required,
    options,
  });
}

async function getSubscriptionsDropdown(
  auth: any,
  config: SubscriptionDropdownConfig,
) {
  try {
    const parsedSubscriptions = await fetchSubscriptionsFromHostSession(auth);

    return createSubscriptionDropdown(config, {
      disabled: false,
      options: parsedSubscriptions.map((obj: { id: string; name: string }) => ({
        label: obj.name,
        value: obj.id,
      })),
    });
  } catch (error) {
    return createSubscriptionDropdown(config, {
      disabled: true,
      options: [],
      placeholder: 'Something went wrong fetching subscriptions',
      error: `${error}`,
    });
  }
}

function createSubscriptionDynamicProperty(
  config: SubscriptionDropdownConfig,
  propertyKey: string,
) {
  return Property.DynamicProperties({
    displayName: '',
    required: true,
    refreshers: [
      'auth',
      'useHostSession',
      'useHostSession.useHostSessionCheckbox',
    ],
    props: async ({ auth, useHostSession }) => {
      try {
        const useHost = useHostSession?.['useHostSessionCheckbox'] as
          | boolean
          | undefined;

        if (!auth && !useHost) {
          return {
            [propertyKey]: createSubscriptionDropdown(config, {
              disabled: true,
              options: [],
              placeholder: 'Please authenticate first',
            }),
          };
        }

        const dropdown = useHost
          ? await getSubscriptionsDropdown(auth, config)
          : config.multiSelect
          ? createSubscriptionDropdown(
              config,
              (await getAzureSubscriptionsStaticDropdown(auth)).options,
            )
          : await getAzureSubscriptionsStaticDropdown(auth);

        return { [propertyKey]: dropdown };
      } catch (error) {
        return {
          [propertyKey]: createSubscriptionDropdown(config, {
            disabled: true,
            options: [],
            placeholder: 'Something went wrong fetching subscriptions',
            error: getAzureErrorMessage(error),
          }),
        };
      }
    },
  });
}

export const subDropdown = createSubscriptionDynamicProperty(
  SINGLE_SELECT_CONFIG,
  'subDropdown',
);

export const subMultiSelectDropdown = createSubscriptionDynamicProperty(
  MULTI_SELECT_CONFIG,
  'subMultiSelect',
);

export async function getSubscriptionsDropdownForHostSession(auth: any) {
  return getSubscriptionsDropdown(auth, SINGLE_SELECT_CONFIG);
}

export async function getSubscriptionsMultiSelectForHostSession(auth: any) {
  return getSubscriptionsDropdown(auth, MULTI_SELECT_CONFIG);
}
