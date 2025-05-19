import { createAction, Property } from '@openops/blocks-framework';
import {
  BqColumnTypesEnum,
  dryRunCheckBox,
  getUseHostSessionProperty,
  googleCloudAuth,
  handleCliError,
  tryParseJson,
} from '@openops/common';
import { projectCliDropdown } from '../common-properties';
import { runCommand } from '../google-cloud-cli';

type SqlQueryParams =
  | {
      paramName: string;
      columnType: { label: BqColumnTypesEnum; value: BqColumnTypesEnum };
      value: string;
    }
  | undefined;

export const executeSqlQueryAction = createAction({
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
    sqlText: Property.LongText({
      displayName: 'SQL query',
      required: true,
      description:
        'The SQL statement to execute. You can use named parameters like `:name` or numbered placeholders like `:1`, `:2`, etc.',
      supportsAI: true,
    }),
    params: Property.Array({
      displayName: 'Parameters',
      required: false,
      properties: {
        paramName: Property.ShortText({
          displayName: 'Parameter name',
          required: true,
        }),
        columnType: Property.StaticDropdown({
          displayName: 'Column type',
          required: true,
          options: {
            options: Object.keys(BqColumnTypesEnum).map((key) => ({
              label: BqColumnTypesEnum[key as keyof typeof BqColumnTypesEnum],
              value: key,
            })),
          },
        }),
        value: Property.ShortText({
          displayName: 'Parameter value',
          required: true,
        }),
      },
    }),
    dryRun: dryRunCheckBox(),
  },
  async run({ propsValue, auth }) {
    const { project, sqlText, dryRun } = propsValue;

    const params: SqlQueryParams[] =
      (propsValue.params as SqlQueryParams[]) ?? [];

    try {
      const paramFlags =
        params.map(
          (param) =>
            `--parameter='${param?.paramName}:${param?.columnType}:${param?.value}'`,
        ) ?? [];

      const command = [
        'bq query',
        '--nouse_legacy_sql',
        '--format=json',
        ...(dryRun ? ['--dry_run'] : []),
        ...paramFlags,
        `'${sqlText}'`,
      ].join(' ');

      const result = await runCommand(
        command,
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
