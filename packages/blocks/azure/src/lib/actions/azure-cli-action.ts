import { createAction, Property } from '@openops/blocks-framework';
import { azureAuth, dryRunCheckBox } from '@openops/common';
import { logger } from '@openops/server-shared';
import { runCommand } from '../azure-cli';
import { subDropdown, useHostSession } from '../common-properties';

export const azureCliAction = createAction({
  auth: azureAuth,
  name: 'azure_cli',
  description: 'Execute Azure CLI command',
  displayName: 'Azure CLI',
  props: {
    useHostSession: useHostSession,
    subscriptions: subDropdown,
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
      let message = 'An error occurred while running an Azure CLI command: ';
      if (String(error).includes('login --service-principal')) {
        message += 'login --service-principal ***REDACTED***';
      } else {
        message += error;
      }
      throw new Error(message);
    }
  },
});
