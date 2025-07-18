import {
  DropdownProperty,
  Property,
} from '@openops/blocks-framework';
import { getUserProjects } from './gitlab-api';

export function getProjectProperty(): DropdownProperty<
  { id: string; name: string; path_with_namespace: string },
  true
> {
  return Property.Dropdown<{ id: string; name: string; path_with_namespace: string }, true>({
    displayName: 'Project',
    refreshers: ['auth'],
    required: true,
    options: async ({ auth }) => {
      if (!auth) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please authenticate first',
        };
      }
      const authProp: string = auth as string;
      const projects = await getUserProjects(authProp);
      return {
        disabled: false,
        options: projects.map((project) => {
          return {
            label: project.path_with_namespace,
            value: {
              id: project.id.toString(),
              name: project.name,
              path_with_namespace: project.path_with_namespace,
            },
          };
        }),
      };
    },
  });
}