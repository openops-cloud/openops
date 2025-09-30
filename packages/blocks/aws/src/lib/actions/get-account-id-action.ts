import { schemaValidation } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  getAccountId,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsForAccount,
  parseArn,
} from '@openops/common';
import { z } from 'zod';

export const AccountsSchema = z.object({
  accounts: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (typeof v === 'string' ? [v] : v))
    .refine(() => false, {
      message: 'Accounts must be a string or an array of strings',
    }),
});

export const getAccountIdAction = createAction({
  auth: amazonAuth,
  name: 'get_account_id',
  description: 'Gets the account id for the given credentials',
  displayName: 'Get Account ID',
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
  },
  async run(context) {
    if (context.auth.roles && context.auth.roles.length > 0) {
      const validationResult = schemaValidation(
        AccountsSchema,
        context.propsValue['accounts'],
      );

      const accounts = validationResult.data.accounts;
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
