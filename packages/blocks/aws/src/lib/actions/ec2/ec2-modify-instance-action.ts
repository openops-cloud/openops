import { _InstanceType, ShutdownBehavior } from '@aws-sdk/client-ec2';
import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  ec2ModifyInstanceAttribute,
  getCredentialsForAccount,
  parseArn,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ec2ModifyInstanceAction = createAction({
  auth: amazonAuth,
  name: 'ec2_modify_instance',
  description: 'Modify the given EC2 instance',
  displayName: 'EC2 Modify Instance',
  riskLevel: RiskLevel.HIGH,
  isWriteAction: true,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the EC2 instance to modify',
      required: true,
    }),
    modifiers: Property.DynamicProperties({
      displayName: 'Modifiers',
      description: 'Configuration modifiers for the EC2 instance',
      required: true,
      refreshers: [],
      props: async () => {
        const properties: { [key: string]: any } = {};
        properties['modifiers'] = Property.Array({
          displayName: 'Modifiers',
          required: true,
          properties: {
            attributeName: Property.StaticDropdown({
              displayName: 'Attribute Name',
              required: true,
              options: {
                options: [
                  { label: 'DisableApiStop', value: 'DisableApiStop' },
                  {
                    label: 'DisableApiTermination',
                    value: 'DisableApiTermination',
                  },
                  { label: 'EbsOptimized', value: 'EbsOptimized' },
                  { label: 'EnaSupport', value: 'EnaSupport' },
                  { label: 'InstanceType', value: 'InstanceType' },
                ],
              },
            }),
            attributeValue: Property.DynamicProperties({
              displayName: 'New Field Value',
              required: true,
              refreshers: ['attributeName'],
              props: async ({
                attributeName,
              }): Promise<{ [key: string]: any }> => {
                if (!attributeName) {
                  return { attributeValue: {} };
                }
                const attributeNameProp = attributeName as unknown as string;

                return {
                  attributeValue: getPropertyWithAttributeName(
                    attributeNameProp,
                  ) as any,
                };
              },
            }),
          },
        });

        return properties;
      },
    }),
    dryRun: dryRunCheckBox(),
  },

  async run(context) {
    try {
      const modifiersProperty = context.propsValue['modifiers'][
        'modifiers'
      ] as unknown as { attributeName: string; attributeValue: any }[];
      const modifiers: { [key: string]: any } = {};
      modifiersProperty?.map((modifier) => {
        modifiers[modifier.attributeName] =
          modifier.attributeValue['attributeValue'];
      });

      const { arn } = context.propsValue;
      const { region, resourceId, accountId } = parseArn(arn);
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );
      const result = await ec2ModifyInstanceAttribute({
        credentials,
        region,
        instanceId: resourceId,
        dryRun: context.propsValue['dryRun'],
        newConfiguration: modifiers,
      });

      return result;
    } catch (error) {
      throw new Error(
        'An error occurred while modifying EC2 instance: ' + error,
      );
    }
  },
});

function getPropertyWithAttributeName(attributeName: string) {
  switch (attributeName) {
    case 'DisableApiTermination': {
      return Property.Checkbox({
        displayName: 'Disable API Termination',
        description:
          'If the value is true, you cant terminate the instance using the Amazon EC2 console, CLI, or API; otherwise, you can. You cannot use this parameter for Spot Instances.',
        required: true,
      });
    }
    case 'DisableApiStop': {
      return Property.Checkbox({
        displayName: 'Disable API Stop',
        description:
          'Indicates whether an instance is enabled for stop protection',
        required: true,
      });
    }
    case 'EbsOptimized': {
      return Property.Checkbox({
        displayName: 'Enable EBS Optimization',
        description:
          'Specifies whether the instance is optimized for Amazon EBS I/O',
        required: true,
      });
    }
    case 'EnaSupport': {
      return Property.Checkbox({
        displayName: 'Enable Ena Support',
        description:
          'Set to true to enable enhanced networking with ENA for the instance',
        required: true,
      });
    }
    case 'SriovNetSupport': {
      return Property.Checkbox({
        displayName: 'Enable SR-IOV Net Support',
        description:
          'Sets the SR-IOV Net Support to simple to enable enhanced networking with the Intel 82599 Virtual Function interface for the instance',
        required: true,
      });
    }
    case 'InstanceType': {
      return Property.StaticDropdown({
        displayName: 'New Instance Type',
        options: {
          options: Object.entries(_InstanceType).map(([key, value]) => ({
            label: value,
            value: value,
          })),
        },
        required: true,
      });
    }
    case 'Groups': {
      return Property.Array({
        displayName: 'New Security Groups',
        description:
          'Replaces the security groups of the instance with the specified security groups. You must specify the ID of at least one security group, even if its just the default security group for the VPC.',
        required: true,
      });
    }
    case 'Ec2ShutdownBehavior': {
      return Property.StaticDropdown({
        displayName: 'New Shutdown Behavior',
        options: {
          options: Object.keys(ShutdownBehavior).map((x) => ({
            label: x,
            value: x,
          })),
        },
        required: true,
      });
    }
    case 'Kernel': {
      return Property.LongText({
        displayName: 'New Kernel ID',
        required: true,
      });
    }
    case 'RamDisk': {
      return Property.LongText({
        displayName: 'New Ram Disk',
        required: true,
      });
    }
    default: {
      throw new Error('Invalid attribute name: ' + attributeName);
    }
  }
}
