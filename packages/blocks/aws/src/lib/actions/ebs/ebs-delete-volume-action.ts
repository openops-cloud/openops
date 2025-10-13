import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  deleteEbsVolume,
  dryRunCheckBox,
  getCredentialsForAccount,
  parseArn,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ebsDeleteVolumeAction = createAction({
  auth: amazonAuth,
  name: 'ebs_delete_volumes',
  description: 'Delete the given EBS Volume',
  displayName: 'EBS Delete Volume',
  riskLevel: RiskLevel.HIGH,
  isWriteAction: true,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the EBS Volume to delete',
      required: true,
    }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { arn } = context.propsValue;
      const { region, resourceId, accountId } = parseArn(arn);
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );
      const result = await deleteEbsVolume(
        credentials,
        region,
        resourceId,
        context.propsValue['dryRun'],
      );

      return result;
    } catch (error) {
      throw new Error('An error occurred while deleting EBS Volume: ' + error);
    }
  },
});
