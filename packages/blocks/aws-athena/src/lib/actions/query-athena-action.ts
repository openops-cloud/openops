import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  dryRunCheckBox,
  getCredentialsFromAuth,
  listAthenaDatabases,
  runAndWaitForQueryResult,
} from '@openops/common';

export const runAthenaQueryAction = createAction({
  auth: amazonAuth,
  name: 'athena_query',
  description: 'Query Athena database',
  displayName: 'Query Athena database',
  props: {
    query: Property.LongText({
      displayName: 'Query',
      description: 'Query to run on the Athena database.',
      supportsAI: true,
      required: true,
    }),
    database: Property.Dropdown<string>({
      displayName: 'Database',
      description: 'Database that contains the table to query on',
      refreshers: ['auth'],
      required: true,
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Please authenticate to see databases.',
          };
        }

        const authProp = auth as {
          accessKeyId: string;
          secretAccessKey: string;
          defaultRegion: string;
        };
        const credentials = await getCredentialsFromAuth(authProp);

        const databases = await listAthenaDatabases(
          credentials,
          authProp.defaultRegion,
        );

        return {
          disabled: false,
          options: databases.map((database) => {
            return {
              label: database.Name as string,
              value: database.Name as string,
            };
          }),
        };
      },
    }),
    outputBucket: Property.LongText({
      displayName: 'Output Bucket',
      description: 'Bucket path to save the query results to',
      required: true,
    }),
    limit: Property.Number({
      displayName: 'Row Limit',
      description:
        'Limits the number of rows to the specified number. Gets overriden if a limit is specified in the query.',
      defaultValue: 10,
      required: true,
    }),
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    const { dryRun } = context.propsValue;

    let query = context.propsValue.query;
    const regex = /LIMIT\s*\d+\s*$/i;
    if (!regex.test(query)) {
      query += ` LIMIT ${context.propsValue.limit}`;
    }

    if (dryRun) {
      return `Step execution skipped, dry run flag enabled. Athena query will not be executed. Query: '${query}'`;
    }

    const database = context.propsValue.database;

    if (database === undefined) {
      throw new Error('Database is undefined.');
    }

    try {
      const credentials = await getCredentialsFromAuth(context.auth);

      return await runAndWaitForQueryResult(
        credentials,
        context.auth.defaultRegion,
        query,
        database,
        context.propsValue.outputBucket,
      );
    } catch (error) {
      throw new Error(
        `An error occurred while running the query '${query}': ${error}`,
      );
    }
  },
});
