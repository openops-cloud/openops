import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { databricksAuth } from './auth';
import { getDatabricksToken } from './get-databricks-token';
import { makeDatabricksHttpRequest } from './make-databricks-http-request';

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

      const workspaces = await makeDatabricksHttpRequest<any[]>({
        deploymentName: 'accounts',
        token: accessToken,
        method: 'GET',
        path: `/api/2.0/accounts/${authValue.accountId}/workspaces`,
      });

      const options: DropdownOption<string>[] = workspaces.map((workspace) => ({
        label: workspace.workspace_name,
        value: workspace.deployment_name,
      }));

      return {
        disabled: false,
        options: options,
      };
    } catch (error: any) {
      return {
        disabled: true,
        placeholder: 'An error occurred while fetching workspaces',
        error: error?.message,
        options: [],
      };
    }
  },
});
