import { createAction, Property, Validators } from '@openops/blocks-framework';
import {
  dryRunCheckBox,
  getUseHostSessionProperty,
  googleCloudAuth,
  handleCliError,
  tryParseJson,
} from '@openops/common';
import { projectCliDropdown } from '../common-properties';
import { runCommand } from '../google-cloud-cli';

export const executeSqlQuery = createAction({
  auth: googleCloudAuth,
  name: 'google_execute_sql_query',
  displayName: 'Run BigQuery SQL Query',
  description: 'Run a SQL query on BigQuery and return the results.',
  props: {
    useHostSession: getUseHostSessionProperty(
      'Google Cloud',
      'gcloud auth login',
    ),
    project: projectCliDropdown,
    sqlText: Property.ShortText({
      displayName: 'SQL query',
      required: true,
      description:
        'The SQL statement to execute. You can use named parameters like `:name` or numbered placeholders like `:1`, `:2`, etc.',
    }),
    params: Property.Object({
      displayName: 'Parameters',
      required: false,
      description:
        'Optional parameter values to bind to the SQL query. Use a key-value structure where keys match named parameters or position indices.',
    }),
    timeout: Property.Number({
      displayName: 'Query timeout',
      description:
        'Maximum number of seconds to wait for a query to complete before timing out. Min value is 5',
      required: true,
      validators: [Validators.number, Validators.minValue(0)],
      defaultValue: 60,
    }),
    dryRun: dryRunCheckBox(),
  },
  async run({ propsValue, auth }) {
    const { project, sqlText, timeout, params, dryRun } = propsValue;

    if (dryRun) {
      return `Step execution skipped, dry run flag enabled. Google Cloud CLI command will not be executed. Command: '${sqlText}'`;
    }

    try {
      const result = await runCommand(
        `bq query --nouse_legacy_sql '${sqlText}'`,
        auth,
        propsValue.useHostSession?.['useHostSessionCheckbox'],
        project,
        'bq',
      );
      return tryParseJson(result);
    } catch (error) {
      handleCliError({
        provider: 'Google Cloud',
        command: sqlText,
        error,
      });
    }
  },
});
