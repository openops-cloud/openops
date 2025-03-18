import { createAction, Property } from '@openops/blocks-framework';
import { azureAuth, dryRunCheckBox } from '@openops/common';
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
    ids: Property.Array({
      displayName: 'Resource IDs',
      description:
        'One or more resource IDs (space-delimited). If provided, no other "Resource Id" arguments should be specified.',
      required: false,
    }),
    resourceGroup: Property.ShortText({
      displayName: 'Resource Group',
      description: 'Name of a resource group.',
      required: false,
    }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    const command = buildCommand(context.propsValue);
    logger.info(`Running command: ${command}`);
    try {
      const { dryRun } = context.propsValue;

      if (dryRun) {
        return 'Step execution skipped, dry run flag enabled. Azure get cost recommendations wont be run.';
      }

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

function buildCommand(propsValue: any) {
  const { ids, resourceGroup } = propsValue;
  let command = `az advisor recommendation list --category 'cost' --output json`;

  if (ids && ids.length > 0 && resourceGroup) {
    throw new Error(
      'Resource IDs and Resource Group cannot be specified together. Please only specify one of them.',
    );
  }

  if (ids && ids.length > 0) {
    command += ` --ids ${ids.map((id: string) => `"${id}"`).join(' ')}`;
  }

  if (resourceGroup) {
    command += ` --resource-group ${resourceGroup}`;
  }

  return command;
}
