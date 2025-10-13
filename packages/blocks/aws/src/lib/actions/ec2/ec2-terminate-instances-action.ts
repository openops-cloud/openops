import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  convertToARNArrayWithValidation,
  dryRunCheckBox,
  getCredentialsForAccount,
  getResourceIdFromArn,
  groupARNsByAccount,
  groupARNsByRegion,
  initiateEc2InstanceTermination,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ec2TerminateInstancesAction = createAction({
  auth: amazonAuth,
  name: 'ec2_terminate_instances',
  description: 'Terminate the provided EC2 instances',
  displayName: 'EC2 Terminate Instances',
  riskLevel: RiskLevel.HIGH,
  IsWriteAction: true,
  props: {
    instanceARNs: Property.Array({
      displayName: 'Instance ARNs',
      description: 'The ARN of the EC2 instances to terminate',
      required: true,
    }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const instanceARNs = convertToARNArrayWithValidation(
        context.propsValue.instanceARNs,
      );
      const instancesByAccount = groupARNsByAccount(instanceARNs);
      const promises = [];

      for (const account in instancesByAccount) {
        const arnsForAccount = instancesByAccount[account];
        const credentials = await getCredentialsForAccount(
          context.auth,
          account,
        );
        const instancesByRegion = groupARNsByRegion(arnsForAccount);

        for (const region in instancesByRegion) {
          const arnsForRegion = instancesByRegion[region];
          const instanceIds = arnsForRegion.map(getResourceIdFromArn);
          const result = initiateEc2InstanceTermination(
            credentials,
            region,
            instanceIds,
            context.propsValue.dryRun,
          );

          promises.push(result);
        }
      }

      const result = (await Promise.all(promises)).flat();
      return result;
    } catch (error) {
      throw new Error(
        'An error occurred while terminating EC2 Instances: ' + error,
      );
    }
  },
});
