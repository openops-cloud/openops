import { Property } from '@openops/blocks-framework';
import { getResourcesLogicalId } from '../yq-cli';

const ValidResourceTypes = [
  'AWS::EC2::Instance',
  'AWS::EC2::Volume',
  'AWS::RDS::DBInstance',
];

export function getLogicalIdDropdown() {
  return Property.Dropdown({
    displayName: 'Logical Id',
    description: 'Logical Id of the resource to be deleted',
    refreshers: ['template'],
    required: true,
    options: async ({ template }) => {
      if (!template) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please provide a template.',
        };
      }

      const options = await getResourcesDropdownOptions(template as string);

      if (!options || options.length === 0) {
        return {
          disabled: true,
          options: [],
          placeholder:
            'The provided template does not contain resources that can be modified.',
        };
      }

      return {
        disabled: false,
        options: options,
      };
    },
  });
}

export function getLogicalIdDropdownWithType() {
  return Property.Dropdown({
    displayName: 'Logical Id',
    description:
      'Logical Id of the resource to be updated. Supported resources: AWS::EC2::Instance, AWS::EC2::Volume, AWS::RDS::DBInstance',
    refreshers: ['template'],
    required: true,
    options: async ({ template }) => {
      if (!template) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please provide a template.',
        };
      }

      const options = await getResourcesDropdownOptionsWithType(
        template as string,
      );

      if (!options || options.length === 0) {
        return {
          disabled: true,
          options: [],
          placeholder:
            'The provided template does not contain resources that can be modified.',
        };
      }

      return {
        disabled: false,
        options: options,
      };
    },
  });
}

async function getResourcesDropdownOptions(
  template: string,
): Promise<{ label: string; value: string }[]> {
  const resources = await getResourcesLogicalId(template);

  const options = resources.map((resource) => {
    return {
      label: resource.logicalId,
      value: resource.logicalId,
    };
  });

  return options;
}

async function getResourcesDropdownOptionsWithType(
  template: string,
): Promise<{ label: string; value: { logicalId: string; type: string } }[]> {
  const resources = await getResourcesLogicalId(template);

  const options = resources
    .filter((resource) => ValidResourceTypes.includes(resource.type))
    .map((resource) => {
      return {
        label: resource.logicalId,
        value: {
          logicalId: resource.logicalId,
          type: resource.type,
        },
      };
    });

  return options;
}
