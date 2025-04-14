import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { databricksAuth } from './auth';
import { getDatabricksToken } from './get-databricks-token';

export const warehouseId = Property.Dropdown({
  displayName: 'Warehouse',
  description:
    'Specifies which SQL warehouse in your Databricks workspace should be used to run the query. You must have access to this warehouse.',
  refreshers: ['workspaceDeploymentName'],
  required: true,
  options: async ({ auth, workspaceDeploymentName }) => {
    if (!workspaceDeploymentName) {
      return {
        disabled: true,
        placeholder: 'Please select a workspace',
        options: [],
      };
    }
    try {
      const authValue = auth as BlockPropValueSchema<typeof databricksAuth>;
      const accessToken = await getDatabricksToken(authValue);

      const workspaceListUrl = `https://${workspaceDeploymentName}.cloud.databricks.com/api/2.0/sql/warehouses`;

      const headers = new AxiosHeaders({
        Authorization: `Bearer ${accessToken}`,
      });

      const { warehouses } = await makeHttpRequest<{ warehouses: any[] }>(
        'GET',
        workspaceListUrl,
        headers,
      );

      const options: DropdownOption<string>[] = warehouses.map((warehouse) => ({
        label: warehouse.name,
        value: warehouse.id,
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
        placeholder: 'An error occurred while fetching warehouses',
        error: errorMessage,
        options: [],
      };
    }
  },
});
