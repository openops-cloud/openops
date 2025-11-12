import {
  MultiSelectDropdownProperty,
  OAuth2PropertyValue,
  Property,
} from '@openops/blocks-framework';
import { getCollaborators } from './github-api';

export function getReviewersProperty(): MultiSelectDropdownProperty<
  string,
  false
> {
  return Property.MultiSelectDropdown({
    displayName: 'Reviewers',
    description: 'List of GitHub usernames to be notified to review the pull request',
    required: false,
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

      const collaborators = await getCollaborators(
        repo.owner,
        repo.repo,
        authProp,
      );

      return {
        disabled: false,
        options: collaborators.map((collaborator) => {
          return {
            label: collaborator.login,
            value: collaborator.login,
          };
        }),
      };
    },
  });
}
