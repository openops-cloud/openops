import { createAction, Property } from '@openops/blocks-framework';
import { amazonAuth, getRoleForAccount } from './auth';

export function getAccountAlias() {
  return createAction({
    auth: amazonAuth,
    name: 'account_get_alias',
    description: 'Get account alias from the AWS connection',
    displayName: 'Get Account Alias',
    requireToolApproval: false,
    props: {
      accountId: Property.ShortText({
        displayName: 'Account ID',
        required: true,
      }),
    },
    async run(context) {
      const { accountId } = context.propsValue;

      const role = getRoleForAccount(context.auth, accountId);

      return role?.accountName;
    },
  });
}
