import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { updateResourceProperties } from '../hcledit-cli';
import { getTerraformResourceProperties } from './resource-terraform-properties';
import { Resource } from './resource-type';
import { getResourcesDropdown } from './resources-dropdown';

export const modifyTemplate = createAction({
  auth: BlockAuth.None(),
  name: 'update_terraform_file',
  displayName: 'Update resource properties',
  description: 'Update properties of a resource in a given Terraform template',
  requireToolApproval: true,
  props: {
    template: Property.LongText({
      displayName: 'Terraform template',
      required: true,
    }),

    resourceNameAndType: getResourcesDropdown(),

    updates: getTerraformResourceProperties(),
  },
  async run({ propsValue }) {
    const { template, resourceNameAndType, updates } = propsValue;

    const parsedResource: Resource =
      typeof resourceNameAndType === 'string'
        ? JSON.parse(resourceNameAndType)
        : resourceNameAndType;

    const modifications = updates['updates'] as unknown as {
      propertyName: string;
      propertyValue: string;
    }[];

    const newTemplate = await updateResourceProperties(
      template,
      parsedResource.type,
      parsedResource.name,
      modifications,
    );

    return newTemplate;
  },
});
