import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import { deleteResource } from '../yq-cli';
import { getLogicalIdDropdown } from './logical-id-dropdown';

export const deleteResourceFromTemplate = createAction({
  auth: BlockAuth.None(),
  requireAuth: false,
  name: 'delete_resource',
  displayName: 'Delete resource',
  description: 'Delete a resource from a given CloudFormation template',
  isWriteAction: true,
  props: {
    template: Property.LongText({
      displayName: 'CloudFormation template',
      required: true,
    }),

    logicalId: getLogicalIdDropdown(),
  },
  async run({ propsValue }) {
    const { template, logicalId } = propsValue;

    const newTemplate = await deleteResource(template, logicalId);

    return newTemplate;
  },
});
