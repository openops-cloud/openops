import { createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  getAccountId,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsForAccount,
  parseArn,
} from '@openops/common';

export const getAccountIdAction = createAction({
  auth: amazonAuth,
  name: 'get_account_id',
  description:
    'Gets the account ids for the accounts under the selected connection',
  displayName: 'Get Account IDs',
  IsWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
  },
  async run(context) {
    if (context.auth.roles && context.auth.roles.length > 0) {
      const accounts = context.propsValue['accounts']['accounts'] as unknown as
        | string[]
        | undefined;
      const roles = context.auth.roles.filter(
        (role: any) =>
          accounts?.length &&
          accounts?.includes(parseArn(role.assumeRoleArn).accountId),
      );

      return roles.map((role: any) => {
        return {
          accountId: parseArn(role.assumeRoleArn).accountId,
          accountName: role.accountName,
        };
      });
    }

    const credentials = await getCredentialsForAccount(context.auth);
    const accountId = await getAccountId(
      credentials,
      context.auth.defaultRegion,
    );

    return [{ accountId: accountId }];
  },
});
