import { Property } from '@openops/blocks-framework';
import { getResources, TerraformResource } from '../hcledit-cli';

const ValidResourceTypes = [
  'aws_instance',
  'aws_ebs_volume',
  'aws_db_instance',
];

export function getResourcesDropdown() {
  return Property.Dropdown({
    displayName: 'Resource Name',
    description: 'Resource name of the resource to be deleted',
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

async function getResourcesDropdownOptionsWithType(
  template: string,
): Promise<{ label: string; value: TerraformResource }[]> {
  const resources = await getResources(template);

  const options = resources
    .filter((resource) => ValidResourceTypes.includes(resource.type))
    .map((resource) => {
      return {
        label: resource.name,
        value: resource,
      };
    });

  return options;
}
