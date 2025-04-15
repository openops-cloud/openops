import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { databricksAuth } from './auth';
import { getDatabricksToken } from './get-databricks-token';

export const workspaceDeploymentName = Property.Dropdown({
  displayName: 'Workspace',
  refreshers: ['auth'],
  required: true,
  options: async ({ auth }) => {
    if (!auth) {
      return {
        disabled: true,
        placeholder: 'Please select a connection',
        options: [],
      };
    }
    try {
      const authValue = auth as BlockPropValueSchema<typeof databricksAuth>;
      const accessToken = await getDatabricksToken(authValue);

      const workspaceListUrl = `https://accounts.cloud.databricks.com/api/2.0/accounts/${authValue.accountId}/workspaces`;

      const headers = new AxiosHeaders({
        Authorization: `Bearer ${accessToken}`,
      });

      const workspaces = await makeHttpRequest<any[]>(
        'GET',
        workspaceListUrl,
        headers,
      );

      const options: DropdownOption<string>[] = workspaces.map((workspace) => ({
        label: workspace.workspace_name,
        value: workspace.deployment_name,
      }));

      return {
        disabled: false,
        options: options,
      };
    } catch (error: any) {
      let errorMessage;
      try {
        errorMessage = JSON.parse(error.message)?.message;
      } catch {
        errorMessage = String(error.message);
      }

      return {
        disabled: true,
        placeholder: 'An error occurred while fetching workspaces',
        error: errorMessage,
        options: [],
      };
    }
  },
});
