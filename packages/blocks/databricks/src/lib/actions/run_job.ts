import { createAction, Property } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { databricksAuth } from '../common/auth';
import { getDatabricksToken } from '../common/get-databricks-token';
import { jobId } from '../common/job-id';
import { workspaceDeploymentName } from '../common/workspace-deployment-name';

export const runJob = createAction({
  name: 'runJob',
  auth: databricksAuth,
  displayName: 'Run Databricks Job',
  description:
    'Triggers an existing job in the specified Databricks workspace.',
  props: {
    workspaceDeploymentName: workspaceDeploymentName,
    jobId: jobId,
    parameters: Property.Object({
      displayName: 'Parameters',
      required: false,
      description:
        'Optional parameter values to bind to the SQL query. Use a key-value structure where keys match named parameters or position indices.',
    }),
  },

  async run({ auth, propsValue }) {
    const { workspaceDeploymentName, jobId, parameters } = propsValue;

    const token = await getDatabricksToken(auth);
    const url = `https://${workspaceDeploymentName}.cloud.databricks.com/api/2.2/jobs/run-now`;

    const headers = new AxiosHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const body: Record<string, any> = {
      job_id: jobId,
    };

    if (parameters) {
      body['notebook_params'] = parameters;
    }

    const result = await makeHttpRequest('POST', url, headers, body);

    return result;
  },
});
