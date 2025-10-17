import { VolumeConfiguration } from '@aws-sdk/client-compute-optimizer';
import { VolumeType } from '@aws-sdk/client-ec2';
import { createAction, Property, Validators } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsForAccount,
  modifyEbsVolume,
  parseArn,
  waitForProperties,
} from '@openops/common';
import { RiskLevel } from '@openops/shared';

export const ebsModifyVolumeAction = createAction({
  auth: amazonAuth,
  name: 'ebs_modify_volume',
  description: 'Modify the given EBS volume',
  displayName: 'EBS Modify Volume',
  riskLevel: RiskLevel.HIGH,
  isWriteAction: true,
  props: {
    arn: Property.ShortText({
      displayName: 'ARN',
      description: 'The ARN of the EBS Volume to modify',
      required: true,
    }),
    changeVolumeType: Property.Checkbox({
      displayName: 'Change volume type',
      required: false,
    }),
    newVolumeType: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['changeVolumeType'],
      props: async ({ changeVolumeType }) => {
        if (!changeVolumeType) {
          return {} as any;
        }

        return {
          newVolumeType: Property.StaticDropdown({
            displayName: 'New volume type',
            options: {
              options: Object.keys(VolumeType).map((x) => ({
                label: x,
                value: x,
              })),
            },
            required: true,
          }),
        };
      },
    }),
    changeVolumeSize: Property.Checkbox({
      displayName: 'Change volume size',
      required: false,
    }),
    newVolumeSize: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['changeVolumeSize'],
      props: async ({ changeVolumeSize }) => {
        if (!changeVolumeSize) {
          return {} as any;
        }
        return {
          newVolumeSize: Property.Number({
            displayName: 'New volume size (GB)',
            required: false,
            validators: [Validators.minValue(1), Validators.maxValue(70369)], // max size is 64 TiB
          }),
        };
      },
    }),
    changeVolumeIops: Property.Checkbox({
      displayName: 'Change volume IOPS',
      required: false,
    }),
    newVolumeIops: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['changeVolumeIops'],
      props: async ({ changeVolumeIops }) => {
        if (!changeVolumeIops) {
          return {} as any;
        }
        return {
          newVolumeIops: Property.Number({
            displayName: 'New volume IOPS',
            required: false,
            validators: [Validators.minValue(100), Validators.maxValue(256000)],
          }),
        };
      },
    }),
    changeVolumeThroughput: Property.Checkbox({
      displayName: 'Change volume throughput',
      required: false,
    }),
    newVolumeThroughput: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['changeVolumeThroughput'],
      props: async ({ changeVolumeThroughput }) => {
        if (!changeVolumeThroughput) {
          return {} as any;
        }
        return {
          newVolumeThroughput: Property.Number({
            displayName: 'New volume throughput (MB/s)',
            required: false,
            validators: [Validators.minValue(128), Validators.maxValue(1000)],
          }),
        };
      },
    }),
    ...waitForProperties(),
    dryRun: dryRunCheckBox(),
  },

  async run(context) {
    try {
      const newConfiguration: VolumeConfiguration = {};
      if (context.propsValue['changeVolumeType']) {
        newConfiguration.volumeType = context.propsValue['newVolumeType']?.[
          'newVolumeType'
        ] as VolumeType;
      }
      if (context.propsValue['changeVolumeSize']) {
        newConfiguration.volumeSize = context.propsValue['newVolumeSize']?.[
          'newVolumeSize'
        ] as number;
      }
      if (context.propsValue['changeVolumeIops']) {
        newConfiguration.volumeBaselineIOPS = context.propsValue[
          'newVolumeIops'
        ]?.['newVolumeIops'] as number;
      }
      if (context.propsValue['changeVolumeThroughput']) {
        newConfiguration.volumeBaselineThroughput = context.propsValue[
          'newVolumeThroughput'
        ]?.['newVolumeThroughput'] as number;
      }

      const waitForInSeconds = context.propsValue['shouldWaitForOperation']
        ? context.propsValue['waitForTimeInSecondsProperty'][
            'waitForTimeInSeconds'
          ]
        : undefined;
      const { arn } = context.propsValue;
      const { region, resourceId, accountId } = parseArn(arn);
      const credentials = await getCredentialsForAccount(
        context.auth,
        accountId,
      );
      const result = await modifyEbsVolume({
        credentials,
        region,
        volumeId: resourceId,
        newConfiguration,
        dryRun: context.propsValue['dryRun'],
        waitForInSeconds,
      });

      return result;
    } catch (error) {
      throw new Error('An error occurred while modifying EBS Volume: ' + error);
    }
  },
});
