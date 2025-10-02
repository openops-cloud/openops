import { createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  getAccountId,
  getAccountInformation,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsForAccount,
  parseArn,
} from '@openops/common';

export const getAccountInfoAction = createAction({
  auth: amazonAuth,
  name: 'get_account_info',
  description: 'Gets the account information for the given account id',
  displayName: 'Get Account Information',
  requireToolApproval: false,
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

      const promises = roles.map((role: any) => {
        const accountId = parseArn(role.assumeRoleArn).accountId;

        const actionWithCredentials = async () => {
          const credentials = await getCredentialsForAccount(
            context.auth,
            accountId,
          );
          return await getAccountInformation(
            credentials,
            context.auth.defaultRegion,
            accountId,
          );
        };

        return actionWithCredentials();
      });

      return await Promise.all(promises);
    }

    const credentials = await getCredentialsForAccount(context.auth);
    const accountId = await getAccountId(
      credentials,
      context.auth.defaultRegion,
    );
    const accountInformation = await getAccountInformation(
      credentials,
      context.auth.defaultRegion,
      accountId,
    );

    return [accountInformation];
  },
});
