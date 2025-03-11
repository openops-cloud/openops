import { Property, createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getAwsAccountsSingleSelectDropdown,
  getCredentialsForAccount,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { RiskLevel } from '@openops/shared';
import { runCommand } from './aws-cli';

export const awsCliAction = createAction({
  auth: amazonAuth,
  name: 'aws_cli',
  description: 'Execute AWS CLI command',
  displayName: 'AWS CLI',
  riskLevel: RiskLevel.HIGH,
  props: {
    account: getAwsAccountsSingleSelectDropdown().accounts,
    commandToRun: Property.LongText({ displayName: 'Command', required: true }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { account, commandToRun, dryRun } = context.propsValue;

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
      try {
        const jsonObject = JSON.parse(result);
        return jsonObject;
      } catch (error) {
        return result;
      }
    } catch (error) {
      logger.error('AWS CLI execution failed.', {
        command: context.propsValue['commandToRun'],
        error: error,
      });
      throw new Error(
        'An error occurred while running an AWS CLI command: ' + error,
      );
    }
  },
});
