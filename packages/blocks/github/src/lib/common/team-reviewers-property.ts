import {
  MultiSelectDropdownProperty,
  OAuth2PropertyValue,
  Property,
} from '@openops/blocks-framework';
import { getRepositoryTeams } from './github-api';

export function getTeamReviewersProperty(): MultiSelectDropdownProperty<
  string,
  false
> {
  return Property.MultiSelectDropdown({
    displayName: 'Team Reviewers',
    description:
      'List of GitHub teams to be notified to review the pull request',
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

      const teams = await getRepositoryTeams(repo.owner, repo.repo, authProp);

      return {
        disabled: false,
        options: teams.map((team) => {
          return {
            label: team.name,
            value: team.slug,
          };
        }),
      };
    },
  });
}
