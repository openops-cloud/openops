import { Property, StaticDropdownProperty } from '@openops/blocks-framework';
import {
  getEBSProperty,
  getEC2Property,
  getRDSProperty,
} from '@openops/common';

export function getResourceProperties() {
  return Property.DynamicProperties({
    displayName: 'Resource Properties',
    description: 'CloudFormation resource properties to modify',
    required: true,
    refreshers: ['template', 'logicalId'],
    props: async ({ template, logicalId }) => {
      if (!template || !logicalId) {
        return {};
      }

      const logicalIdProp = logicalId as { type: string };

      let propertyNameDropdown: StaticDropdownProperty<string, true>;
      switch (logicalIdProp.type) {
        case 'AWS::EC2::Instance':
          propertyNameDropdown = getEC2Property('cloudformation');
          break;
        case 'AWS::EC2::Volume':
          propertyNameDropdown = getEBSProperty('cloudformation');
          break;
        case 'AWS::RDS::DBInstance':
          propertyNameDropdown = getRDSProperty('cloudformation');
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
