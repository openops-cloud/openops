import { Property } from '@openops/blocks-framework';
import {
  getEBSProperty,
  getEC2Property,
  getRDSProperty,
} from '@openops/common';

export function getResourceProperties() {
  return Property.DynamicProperties({
    displayName: '',
    description: '',
    required: true,
    refreshers: ['template', 'logicalId'],
    props: async ({ template, logicalId }) => {
      if (!template || !logicalId) {
        return {};
      }

      const logicalIdProp = logicalId as { type: string };

      let propertyNameDropdown: any;

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
        case 'AWS::S3::Bucket':
          propertyNameDropdown = Property.ShortText({
            displayName: 'Property name',
            description: 'The property to modify.',
            required: true,
          });
          break;
        default:
          return {} as any;
      }

      return {
        updates: Property.Array({
          displayName: 'Intended modifications',
          required: true,
          properties: {
            propertyName: propertyNameDropdown,
            propertyValue:
              propertyNameDropdown.type === 'SHORT_TEXT'
                ? Property.Json({
                    displayName: 'Property value',
                    description: 'The new value for the property.',
                    required: true,
                    supportsAI: true,
                  })
                : Property.ShortText({
                    displayName: 'Property value',
                    description: 'The new value for the property.',
                    required: true,
                  }),
          },
        }),
      };
    },
  });
}
