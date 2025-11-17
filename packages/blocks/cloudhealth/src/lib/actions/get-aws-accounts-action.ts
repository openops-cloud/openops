import { createAction } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { getAwsAccounts } from '../common/get-aws-accounts';

export const getAwsAccountsAction = createAction({
  name: 'cloudhealth_get_aws_accounts',
  displayName: 'Get AWS Accounts',
  description: 'Get a list of AWS accounts',
  auth: cloudhealthAuth,
  isWriteAction: false,
  props: {},
  async run(context) {
    return await getAwsAccounts(context.auth);
  },
});
