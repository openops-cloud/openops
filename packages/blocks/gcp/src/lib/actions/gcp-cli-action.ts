import { createAction, Property } from '@openops/blocks-framework';
import { dryRunCheckBox } from '@openops/common';
import { logger } from '@openops/server-shared';
import { gcpAuth } from '../gcp-auth';
import { runCommand } from '../gcp-cli';

export const gcpCliAction = createAction({
  auth: gcpAuth,
  name: 'gcp_cli',
  description: 'Execute GCP CLI command',
  displayName: 'GCP CLI',
  props: {
    project: Property.Dropdown<string>({
      displayName: 'Project',
      description: 'Select a project to run the command in',
      refreshers: ['auth'],
      required: true,
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate to see projects.',
          };
        }

        let projects = [];
        try {
          const projectsString = await runCommand(
            'gcloud projects list --quiet --format=json',
            auth,
          );
          projects = JSON.parse(projectsString);
        } catch (error) {
          logger.error('Error fetching projects', {
            error: error,
          });

          return {
            disabled: true,
            options: [],
            placeholder: `Error fetching projects: ${error}`,
          };
        }

        return {
          disabled: false,
          options: projects.map(
            (project: { name: string; projectId: string }) => {
              return {
                label: project.name,
                value: project.projectId,
              };
            },
          ),
        };
      },
    }),
    commandToRun: Property.LongText({ displayName: 'Command', required: true }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { commandToRun, dryRun } = context.propsValue;

      if (dryRun) {
        return `Step execution skipped, dry run flag enabled. GCP CLI command will not be executed. Command: '${commandToRun}'`;
      }

      const result = await runCommand(commandToRun, context.propsValue.project);
      try {
        const jsonObject = JSON.parse(result);
        return jsonObject;
      } catch (error) {
        return result;
      }
    } catch (error) {
      logger.error('Azure CLI execution failed.', {
        command: context.propsValue['commandToRun'],
        error: error,
      });

      throw new Error(
        'An error occurred while running a GCP CLI command: ' + error,
      );
    }
  },
});
