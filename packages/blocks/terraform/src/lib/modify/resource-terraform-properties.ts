import { Property, StaticDropdownProperty } from '@openops/blocks-framework';
import {
  getEBSProperty,
  getEC2Property,
  getRDSProperty,
} from '@openops/common';
import { Resource } from './resource-type';

export function getTerraformResourceProperties() {
  return Property.DynamicProperties({
    displayName: 'Resource Properties',
    description: 'Terraform resource properties to modify',
    required: true,
    refreshers: ['template', 'resourceNameAndType'],
    props: async ({ template, resourceNameAndType }) => {
      if (!template || !resourceNameAndType) {
        return {};
      }

      const parsedResource: Resource =
        typeof resourceNameAndType === 'string'
          ? JSON.parse(resourceNameAndType)
          : resourceNameAndType;
      const resourceProp = parsedResource as { type: string };

      let propertyNameDropdown: StaticDropdownProperty<string, true>;
      switch (resourceProp.type) {
        case 'aws_instance':
          propertyNameDropdown = getEC2Property('terraform');
          break;
        case 'aws_ebs_volume':
          propertyNameDropdown = getEBSProperty('terraform');
          break;
        case 'aws_db_instance':
          propertyNameDropdown = getRDSProperty('terraform');
          break;
        default:
          return {} as any;
      }

      return {
        updates: Property.Array({
          displayName: 'Intended Modifications',
          required: true,
          properties: {
            propertyName: propertyNameDropdown,
            propertyValue: Property.ShortText({
              displayName: 'Property Value',
              description: 'The new value for the property',
              required: true,
            }),
          },
        }),
      };
    },
  });
}
