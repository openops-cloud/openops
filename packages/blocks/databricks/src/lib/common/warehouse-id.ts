import {
  BlockPropValueSchema,
  DropdownOption,
  Property,
} from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';
import { databricksAuth } from './auth';
import { getDatabricsToken } from './get-databrics-token';

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
    const authValue = auth as BlockPropValueSchema<typeof databricksAuth>;
    const accessToken = await getDatabricsToken(authValue);

    const workspaceListUrl = `https://${workspaceDeploymentName}.cloud.databricks.com/api/2.0/sql/warehouses`;

    const headers = new AxiosHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    const { warehouses } = await makeHttpRequest<{ warehouses: any[] }>(
      'GET',
      workspaceListUrl,
      headers,
    );

    const options: DropdownOption<any>[] = warehouses.map((warehouse) => ({
      label: warehouse.name,
      value: warehouse.id,
    }));

    return {
      disabled: false,
      options: options,
    };
  },
});
