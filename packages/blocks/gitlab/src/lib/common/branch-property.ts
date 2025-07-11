import {
  DropdownProperty,
  Property,
} from '@openops/blocks-framework';
import { listBranches } from './gitlab-api';

export function getBranchProperty(): DropdownProperty<string, true> {
  return Property.Dropdown({
    displayName: 'Branch',
    description: 'The branch to work with',
    required: true,
    refreshers: ['project'],
    options: async ({ project, auth }) => {
      if (!project) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please select a project first',
        };
      }
      const proj = project as { id: string; name: string; path_with_namespace: string };
      const authProp = auth as string;
      const result = await listBranches(proj.id, authProp);
      return {
        disabled: false,
        options: result.map((branch) => {
          return {
            label: branch.name,
            value: branch.name,
          };
        }),
      };
    },
  });
}