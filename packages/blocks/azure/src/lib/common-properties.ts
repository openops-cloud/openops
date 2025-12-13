import { Property } from '@openops/blocks-framework';
import { getAzureSubscriptionsStaticDropdown } from '@openops/common';
import { runCommand } from './azure-cli';
import { getAzureErrorMessage } from './error-helper';

export interface SubscriptionDropdownConfig {
  displayName: string;
  description: string;
  required: boolean;
  multiSelect: boolean;
  preselectAll?: boolean;
}

const SINGLE_SELECT_CONFIG: SubscriptionDropdownConfig = {
  displayName: 'Subscriptions',
  description: 'Select a single subscription from the list',
  required: true,
  multiSelect: false,
};

const MULTI_SELECT_CONFIG: SubscriptionDropdownConfig = {
  displayName: 'Subscriptions',
  description: 'Select subscriptions to perform the action on',
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

  const base = {
    displayName: config.displayName,
    description: config.description,
    required: config.required,
    options,
  } as any;

  if (config.multiSelect && config.preselectAll && options?.options?.length) {
    return PropertyType({
      ...base,
      defaultValue: options.options.map((o: any) => o.value),
    });
  }

  return PropertyType(base);
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

export function createSubscriptionDynamicProperty(
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

        let dropdown;
        if (useHost) {
          dropdown = await getSubscriptionsDropdown(auth, config);
        } else {
          const staticDropdown =
            await getAzureSubscriptionsStaticDropdown(auth);
          dropdown = createSubscriptionDropdown(config, staticDropdown.options);
        }

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
