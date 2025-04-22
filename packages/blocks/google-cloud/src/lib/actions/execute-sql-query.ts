import { createAction } from '@openops/blocks-framework';
import {
  dryRunCheckBox,
  getUseHostSessionProperty,
  googleCloudAuth,
} from '@openops/common';
import { projectCliDropdown } from '../common-properties';

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
    dryRun: dryRunCheckBox(),
  },
  async run(context) {
    return context.auth;
  },
});
