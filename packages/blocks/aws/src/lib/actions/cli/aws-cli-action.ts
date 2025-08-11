import { Property, createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getAwsAccountsSingleSelectDropdown,
  getCredentialsForAccount,
  handleCliError,
  tryParseJson,
} from '@openops/common';
import { runCommand } from './aws-cli';

const BLOCKED_COMMANDS = [
  /^aws\s+configure(\s|$)/i,
  /^aws\s+sso(\s|$)/i,
  /^aws\s+eks\s+update-kubeconfig(\s|$)/i,
];

function isCommandBlocked(command: string): boolean {
  const normalized = command.trim().replace(/\s+/g, ' ');
  return BLOCKED_COMMANDS.some((pattern) => pattern.test(normalized));
}

export const awsCliAction = createAction({
  auth: amazonAuth,
  name: 'aws_cli',
  description: 'Execute AWS CLI command',
  displayName: 'AWS CLI',
  props: {
    account: getAwsAccountsSingleSelectDropdown().accounts,
    commandToRun: Property.LongText({
      displayName: 'Command',
      required: true,
      supportsAI: true,
    }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { account, commandToRun, dryRun } = context.propsValue;

      if (isCommandBlocked(commandToRun)) {
        throw new Error(
          `Command blocked: '${commandToRun}' can corrupt the managed authentication system. ` +
            `Local AWS configuration changes are not permitted to prevent faulty states that require container restarts.`,
        );
      }

      if (dryRun) {
        return `Step execution skipped, dry run flag enabled. AWS CLI command will not be executed. Command: '${commandToRun}'`;
      }

      const credential = await getCredentialsForAccount(
        context.auth,
        account['accounts'],
      );
      const result = await runCommand(
        commandToRun,
        context.auth.defaultRegion,
        credential,
      );

      return tryParseJson(result);
    } catch (error) {
      handleCliError({
        provider: 'AWS',
        command: context.propsValue['commandToRun'],
        error,
      });
    }
  },
});
