import { createAction, Property } from '@openops/blocks-framework';
import {
  dryRunCheckBox,
  getUseHostSessionProperty,
  googleCloudAuth,
  handleCliError,
  tryParseJson,
} from '@openops/common';
import { projectCliDropdown } from '../common-properties';
import { runCommand } from '../google-cloud-cli';

export const googleCloudCliAction = createAction({
  auth: googleCloudAuth,
  name: 'google_cloud_cli',
  description: 'Execute a Google Cloud CLI command',
  displayName: 'Google Cloud CLI',
  props: {
    useHostSession: getUseHostSessionProperty(
      'Google Cloud',
      'gcloud auth login',
    ),
    project: projectCliDropdown,
    commandToRun: Property.LongText({ displayName: 'Command', required: true }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    try {
      const { commandToRun, dryRun } = context.propsValue;

      if (dryRun) {
        return `Step execution skipped, dry run flag enabled. Google Cloud CLI command will not be executed. Command: '${commandToRun}'`;
      }

      const result = await runCommand(
        commandToRun,
        context.auth,
        context.propsValue.useHostSession?.['useHostSessionCheckbox'],
        context.propsValue.project,
      );
      return tryParseJson(result);
    } catch (error) {
      handleCliError({
        provider: 'Google Cloud',
        command: context.propsValue['commandToRun'],
        error,
      });
    }
  },
});
