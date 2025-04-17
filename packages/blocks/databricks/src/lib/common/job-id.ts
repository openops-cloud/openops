import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { databricksAuth } from './auth';
import { getDatabricksToken } from './get-databricks-token';

export const jobId = Property.Dropdown({
  displayName: 'Job',
  required: true,
  refreshers: ['auth', 'workspaceDeploymentName'],
  options: async ({ auth, workspaceDeploymentName }) => {
    if (!auth || !workspaceDeploymentName) {
      return {
        disabled: true,
        placeholder: 'Please select a workspace',
        options: [],
      };
    }

    try {
      const authValue = auth as BlockPropValueSchema<typeof databricksAuth>;
      const accessToken = await getDatabricksToken(authValue);

      const jobListUrl = `https://${workspaceDeploymentName}.cloud.databricks.com/api/2.2/jobs/list`;

      const headers = new AxiosHeaders({
        Authorization: `Bearer ${accessToken}`,
      });

      const resp = await makeHttpRequest<{
        jobs: {
          job_id: string;
          settings: { name: string };
        }[];
      }>('GET', jobListUrl, headers);

      const options: DropdownOption<string>[] = resp.jobs.map((job) => ({
        label: job.settings.name || `Job ${job.job_id}`,
        value: job.job_id,
      }));

      return {
        disabled: false,
        options: options,
      };
    } catch (error: any) {
      return {
        disabled: true,
        placeholder: 'An error occurred while fetching jobs',
        error: error?.message,
        options: [],
      };
    }
  },
});
