import { Property } from '@openops/blocks-framework';
import { runCommand } from './google-cloud-cli';

type Project = {
  name: string;
  projectId: string;
};

export const projectCliDropdown = Property.Dropdown<string>({
  displayName: 'Project',
  description: 'Select a project to run the command in',
  refreshers: [
    'auth',
    'useHostSession',
    'useHostSession.useHostSessionCheckbox',
  ],
  required: true,
  options: async ({ auth, useHostSession }) => {
    const shouldUseHostCredentials =
      (useHostSession as { useHostSessionCheckbox?: boolean })
        ?.useHostSessionCheckbox === true;

    if (!auth && !shouldUseHostCredentials) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Please authenticate to see projects.',
      };
    }

    try {
      const rawProjects = await runCommand(
        'gcloud projects list --format=json',
        auth,
        shouldUseHostCredentials,
      );

      const projects: Project[] = JSON.parse(rawProjects) ?? [];

      return {
        disabled: false,
        options: projects.map(({ name, projectId }) => ({
          label: name,
          value: projectId,
        })),
      };
    } catch (error) {
      return {
        disabled: true,
        options: [],
        placeholder: `Error fetching projects`,
        error: `${error}`,
      };
    }
  },
});
