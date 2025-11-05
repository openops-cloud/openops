import {
  DropdownProperty,
  OAuth2PropertyValue,
  Property,
} from '@openops/blocks-framework';
import { listBranches } from './github-api';

export function getBranchProperty(): DropdownProperty<string, true> {
  return Property.Dropdown({
    displayName: 'Branch',
    description: '',
    required: true,
    refreshers: ['repository'],
    options: async ({ repository, auth }) => {
      if (!repository) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please select a repository first',
        };
      }
      const repo = repository as { repo: string; owner: string };
      const authProp = auth as OAuth2PropertyValue;
      const result = await listBranches(repo.owner, repo.repo, authProp);
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
