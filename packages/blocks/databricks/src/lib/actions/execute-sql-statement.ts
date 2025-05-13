import { createAction, Property, Validators } from '@openops/blocks-framework';
import { databricksAuth } from '../common/auth';
import {
  MAX_QUERY_TIMEOUT_SECONDS,
  RETRY_TIMEOUT_MILLISECONDS,
} from '../common/constants';
import { getDatabricksToken } from '../common/get-databricks-token';
import { makeDatabricksHttpRequest } from '../common/make-databricks-http-request';
import { DatabricksSqlExecutionResult } from '../common/sql-execution-result';
import { warehouseId } from '../common/warehouse-id';
import { workspaceDeploymentName } from '../common/workspace-deployment-name';

export const executeSqlStatement = createAction({
  name: 'executeSqlStatement',
  auth: databricksAuth,
  displayName: 'Execute SQL statement',
  description:
    'Run a SQL query in a Databricks workspace and retrieve results using a specified warehouse.',
  props: {
    workspaceDeploymentName: workspaceDeploymentName,
    warehouseId: warehouseId,
    sqlText: Property.LongText({
      displayName: 'SQL query',
      required: true,
      description:
        'The SQL statement to execute. You can use named parameters like `:name` or numbered placeholders like `:1`, `:2`, etc.',
      supportsAI: true,
    }),
    parameters: Property.Object({
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
      validators: [Validators.number, Validators.minValue(5)],
      defaultValue: 50,
    }),
  },

  async run({ auth, propsValue }) {
    const accessToken = await getDatabricksToken(auth);
    const {
      sqlText,
      parameters,
      warehouseId,
      timeout,
      workspaceDeploymentName,
    } = propsValue;

    const timeoutString =
      timeout <= MAX_QUERY_TIMEOUT_SECONDS
        ? `${timeout}s`
        : `${MAX_QUERY_TIMEOUT_SECONDS}s`;

    const submission =
      await makeDatabricksHttpRequest<DatabricksSqlExecutionResult>({
        deploymentName: workspaceDeploymentName,
        token: accessToken,
        method: 'POST',
        path: '/api/2.0/sql/statements',
        body: {
          statement: sqlText,
          warehouse_id: warehouseId,
          wait_timeout: timeoutString,
          parameters: Object.entries(parameters ?? {}).map(([name, value]) => ({
            name,
            value,
          })),
        },
      });

    if (
      (submission.status.state !== 'RUNNING' &&
        submission.status.state !== 'PENDING') ||
      timeout <= MAX_QUERY_TIMEOUT_SECONDS
    ) {
      return submission;
    }

    const statementId = submission.statement_id;

    const maxAttempts = Math.ceil(
      ((timeout - MAX_QUERY_TIMEOUT_SECONDS) * 1000) /
        RETRY_TIMEOUT_MILLISECONDS,
    );

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse =
        await makeDatabricksHttpRequest<DatabricksSqlExecutionResult>({
          deploymentName: workspaceDeploymentName,
          token: accessToken,
          method: 'GET',
          path: `/api/2.0/sql/statements/${statementId}`,
        });

      const status = statusResponse.status?.state;
      if (status !== 'PENDING' && status !== 'RUNNING') {
        return statusResponse;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_TIMEOUT_MILLISECONDS),
      );
    }

    return submission;
  },
});
