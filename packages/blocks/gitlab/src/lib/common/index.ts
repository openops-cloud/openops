import { getAccessTokenOrThrow } from '@openops/blocks-common';
import { OAuth2PropertyValue, Property } from '@openops/blocks-framework';
import { GitlabApi } from './client';

export const gitlabCommon = {
  projectId: (required = true) =>
    Property.Dropdown({
      displayName: 'Project',
      required,
      refreshers: [],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            placeholder: 'Setup authentication first',
            options: [],
          };
        }
        const client = makeClient({
          auth: auth as OAuth2PropertyValue,
        });
        const res = await client.listProjects({
          simple: true,
          membership: true,
        });
        return {
          disabled: false,
          options: res.map((project) => {
            return {
              label: project.name,
              value: project.id,
            };
          }),
        };
      },
    }),
};

export function makeClient(propsValue: {
  auth: OAuth2PropertyValue;
}): GitlabApi {
  const token = getAccessTokenOrThrow(propsValue.auth);
  return new GitlabApi(token);
}
