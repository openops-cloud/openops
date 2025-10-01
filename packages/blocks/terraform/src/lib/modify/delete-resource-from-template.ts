import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { deleteResource } from '../hcledit-cli';
import { Resource } from './resource-type';
import { getResourcesDropdown } from './resources-dropdown';

export const deleteResourceFromTemplate = createAction({
  auth: BlockAuth.None(),
  name: 'delete_terraform_resource',
  displayName: 'Delete resource',
  description: 'Delete a resource from a given Terraform template',
  requireToolApproval: false,
  props: {
    template: Property.LongText({
      displayName: 'Terraform template',
      required: true,
    }),
    resourceNameAndType: getResourcesDropdown(),
  },
  async run({ propsValue }) {
    const { template, resourceNameAndType } = propsValue;
    const parsedResource: Resource =
      typeof resourceNameAndType === 'string'
        ? JSON.parse(resourceNameAndType)
        : resourceNameAndType;
    return await deleteResource(
      template,
      parsedResource.type,
      parsedResource.name,
    );
  },
});
