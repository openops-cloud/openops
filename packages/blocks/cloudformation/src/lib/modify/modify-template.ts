import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { updateResourceProperties } from '../yq-cli';
import { getLogicalIdDropdownWithType } from './logical-id-dropdown';
import { getResourceProperties } from './resource-properties';

export const modifyTemplate = createAction({
  auth: BlockAuth.None(),
  name: 'update_cloudformation_file',
  displayName: 'Update resource properties',
  description:
    'Update properties of a resource in a given CloudFormation template',
  requireToolApproval: true,
  props: {
    template: Property.LongText({
      displayName: 'CloudFormation template',
      required: true,
    }),

    logicalId: getLogicalIdDropdownWithType(),

    updates: getResourceProperties(),
  },
  async run({ propsValue }) {
    const { template, logicalId, updates } = propsValue;

    const modifications = updates['updates'] as unknown as {
      propertyName: string;
      propertyValue: string;
    }[];

    const newTemplate = await updateResourceProperties(
      template,
      logicalId.logicalId,
      modifications,
    );

    return newTemplate;
  },
});
