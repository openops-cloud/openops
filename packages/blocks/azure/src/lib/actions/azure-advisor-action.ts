import { createAction, Property } from '@openops/blocks-framework';
import { azureAuth } from '@openops/common';
import { logger } from '@openops/server-shared';
import { runCommand } from '../azure-cli';
import { subDropdown, useHostSession } from '../common-properties';

export const advisorAction = createAction({
  auth: azureAuth,
  name: 'advisor',
  description: 'Get Azure Advisor Cost Recommendations',
  displayName: 'Get Advisor Cost Recommendations',
  props: {
    useHostSession: useHostSession,
    subscriptions: subDropdown,
    filterBySelection: Property.StaticDropdown<any>({
      displayName: 'Choose filter',
      description: `Select whether to filter by resource group, resource IDs, or neither.`,
      required: true,
      options: {
        options: [
          { label: 'No filter', value: {} },
          {
            label: 'Filter by Resource IDs',
            value: {
              resourceIds: Property.Array({
                displayName: 'Resource IDs',
                description: 'One or more resource IDs (space-delimited).',
                required: true,
              }),
            },
          },
          {
            label: 'Filter by Resource Group',
            value: {
              resourceGroup: Property.ShortText({
                displayName: 'Resource Group',
                description: 'Name of a resource group.',
                required: true,
              }),
            },
          },
        ],
      },
    }),
    filterByProperty: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: ['filterBySelection'],
      props: async ({ filterBySelection }) => {
        if (!filterBySelection) {
          return {} as any;
        }

        return filterBySelection;
      },
    }),
  },
  async run(context) {
    const command = buildCommand(context.propsValue.filterByProperty);
    logger.info(`Running command: ${command}`);
    try {
      const result = await runCommand(
        command,
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
      logger.error('Failed to fetch Azure cost recommendations', {
        command: command,
        error: error,
      });
      let message =
        'An error occurred while fetching Azure cost recommendations: ';
      if (String(error).includes('login --service-principal')) {
        message += 'login --service-principal ***REDACTED***';
      } else {
        message += error;
      }
      throw new Error(message);
    }
  },
});

function buildCommand(filterByProperty: any) {
  let command = `az advisor recommendation list --category 'cost' --output json`;

  if (filterByProperty?.['resourceGroup']) {
    if (filterByProperty['resourceGroup']) {
      command += ` --resource-group ${filterByProperty['resourceGroup']}`;
    }
  } else if (filterByProperty?.['resourceIds']) {
    if (filterByProperty['resourceIds']?.length > 0) {
      command += ` --ids ${filterByProperty['resourceIds']
        .map((id: string) => `"${id}"`)
        .join(' ')}`;
    }
  }

  return command;
}
