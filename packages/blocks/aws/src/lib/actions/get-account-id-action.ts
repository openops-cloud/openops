import { createAction } from '@openops/blocks-framework';
import {
  addValidationIssue,
  amazonAuth,
  getAccountId,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsForAccount,
  parseArn,
  schemaValidation,
  tryParseJson,
} from '@openops/common';
import { z } from 'zod';

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

const AccountsSchema = z
  .object({
    accounts: z.union([z.string(), z.array(z.string())]),
  })
  .superRefine((obj, ctx) => {
    const accounts = obj.accounts;
    const parsedValue =
      typeof accounts === 'string' ? tryParseJson(accounts) : accounts;

    const isArrayOfStrings =
      Array.isArray(parsedValue) &&
      parsedValue.every((s) => typeof s === 'string');

    if (!isArrayOfStrings) {
      addValidationIssue(
        ctx,
        'Accounts',
        'Accounts must be a string or an array of strings',
      );
      return;
    }

    obj.accounts = parsedValue;
  });
