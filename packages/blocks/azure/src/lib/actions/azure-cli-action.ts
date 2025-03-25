import { createAction, Property } from '@openops/blocks-framework';
import {
  azureAuth,
  dryRunCheckBox,
  handleCliError,
  tryParseJson,
} from '@openops/common';
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

      return tryParseJson(result);
    } catch (error) {
      handleCliError({
        provider: 'Azure',
        command: context.propsValue['commandToRun'],
        error,
      });
    }
  },
});
