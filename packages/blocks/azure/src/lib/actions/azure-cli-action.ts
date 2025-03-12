import { createAction, Property } from '@openops/blocks-framework';
import {
  azureAuth,
  dryRunCheckBox,
  getAzureSubscriptionsStaticDropdown,
} from '@openops/common';
import { logger, SharedSystemProp, system } from '@openops/server-shared';
import { getAzureErrorMessage } from '../error-helper';
import { runCommand } from './azure-cli';

export const azureCliAction = createAction({
  auth: azureAuth,
  name: 'azure_cli',
  description: 'Execute Azure CLI command',
  displayName: 'Azure CLI',
  props: {
    useHostSession: Property.DynamicProperties({
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
    }),
    subscriptions: Property.DynamicProperties({
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
          if (
            useHostSession?.['useHostSessionCheckbox'] as unknown as boolean
          ) {
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
    }),
    commandToRun: Property.LongText({ displayName: 'Command', required: true }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { commandToRun, dryRun } = context.propsValue;

      if (dryRun) {
        return `Step execution skipped, dry run flag enabled. Azure CLI command will not be executed. Command: '${commandToRun}'`;
      }

      const result = await runCommand(
        commandToRun,
        context.auth,
        context.propsValue.useHostSession?.['useHostSessionCheckbox'],
        context.propsValue.subscriptions?.['subDropdown'],
      );
      try {
        const jsonObject = JSON.parse(result);
        return jsonObject;
      } catch (error) {
        return result;
      }
    } catch (error) {
      logger.error('Azure CLI execution failed.', {
        command: context.propsValue['commandToRun'],
        error: error,
      });
      throw new Error(
        'An error occurred while running an Azure CLI command: ' + error,
      );
    }
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
