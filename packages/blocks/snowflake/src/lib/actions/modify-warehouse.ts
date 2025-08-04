import { createAction, Property } from '@openops/blocks-framework';
import snowflake from 'snowflake-sdk';
import { configureConnection } from '../common/configure-connection';
import { customAuth } from '../common/custom-auth';
import { connect, destroy, execute } from '../common/utils';

export const modifyWarehouse = createAction({
  name: 'modifyWarehouse',
  displayName: 'Modify Warehouse',
  description: 'Modify Snowflake warehouse parameters',
  auth: customAuth,
  props: {
    warehouseName: Property.ShortText({
      displayName: 'Warehouse Name',
      description: 'Name of the warehouse to modify',
      required: true,
    }),
    type: Property.StaticDropdown({
      displayName: 'Warehouse Type',
      description: 'Type of the warehouse',
      required: false,
      options: {
        disabled: false,
        options: [
          { label: 'STANDARD', value: 'STANDARD' },
          { label: 'SNOWPARK-OPTIMIZED', value: 'SNOWPARK-OPTIMIZED' },
        ],
      },
    }),
    size: Property.StaticDropdown({
      displayName: 'Warehouse Size',
      description: 'Size of the warehouse',
      required: false,
      options: {
        disabled: false,
        options: [
          { label: 'X-Small', value: 'XSMALL' },
          { label: 'Small', value: 'SMALL' },
          { label: 'Medium', value: 'MEDIUM' },
          { label: 'Large', value: 'LARGE' },
          { label: 'X-Large', value: 'XLARGE' },
          { label: '2X-Large', value: 'XXLARGE' },
          { label: '3X-Large', value: 'XXXLARGE' },
          { label: '4X-Large', value: 'X4LARGE' },
          { label: '5X-Large', value: 'X5LARGE' },
          { label: '6X-Large', value: 'X6LARGE' },
        ],
      },
    }),
    maxClusterCount: Property.Number({
      displayName: 'Max Cluster Count',
      description: 'Maximum number of clusters for a multi-cluster warehouse',
      required: false,
      defaultValue: 1,
    }),
    minClusterCount: Property.Number({
      displayName: 'Min Cluster Count',
      description: 'Minimum number of clusters for a multi-cluster warehouse',
      required: false,
      defaultValue: 1,
    }),
    scalingPolicy: Property.StaticDropdown({
      displayName: 'Scaling Policy',
      description:
        'Policy for automatically starting and shutting down clusters',
      required: false,
      options: {
        disabled: false,
        options: [
          { label: 'Standard', value: 'STANDARD' },
          { label: 'Economy', value: 'ECONOMY' },
        ],
      },
    }),
    autoSuspend: Property.Number({
      displayName: 'Auto Suspend',
      description:
        'Seconds of inactivity after which warehouse is suspended (0 for never)',
      required: false,
      defaultValue: 600,
    }),
    autoResume: Property.Checkbox({
      displayName: 'Auto Resume',
      description:
        'Whether to automatically resume warehouse when a query is submitted',
      required: false,
      defaultValue: true,
    }),
    resourceMonitor: Property.ShortText({
      displayName: 'Resource Monitor',
      description: 'Name of resource monitor to assign to the warehouse',
      required: false,
    }),
    enableQueryAcceleration: Property.Checkbox({
      displayName: 'Enable Query Acceleration',
      description: 'Whether to enable query acceleration service',
      required: false,
      defaultValue: false,
    }),
    queryAccelerationMaxScaleFactor: Property.Number({
      displayName: 'Query Acceleration Max Scale Factor',
      description: 'Maximum scale factor for query acceleration (0-100)',
      required: false,
      defaultValue: 8,
    }),
    maxConcurrencyLevel: Property.Number({
      displayName: 'Max Concurrency Level',
      description: 'Maximum number of concurrent SQL statements',
      required: false,
      defaultValue: 8,
    }),
    statementQueuedTimeoutInSeconds: Property.Number({
      displayName: 'Statement Queued Timeout',
      description: 'Timeout in seconds for queued statements',
      required: false,
      defaultValue: 0,
    }),
    statementTimeoutInSeconds: Property.Number({
      displayName: 'Statement Timeout',
      description: 'Timeout in seconds for running statements',
      required: false,
      defaultValue: 0,
    }),
    comment: Property.LongText({
      displayName: 'Comment',
      description: 'Comment for the warehouse',
      required: false,
    }),
  },
  async run(context) {
    const { warehouseName, ...parameters } = context.propsValue;
    const query = buildAlterWarehouseQuery(warehouseName, parameters);

    const connection = configureConnection(context.auth);
    await connect(connection);

    try {
      await execute(connection, query, [] as snowflake.Binds);
      return { success: true, message: 'Warehouse modified successfully' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to modify warehouse: ${errorMessage}`);
    } finally {
      await destroy(connection);
    }
  },
});

function buildAlterWarehouseQuery(
  warehouseName: string,
  parameters: Record<string, unknown>,
): string {
  const setStatements: string[] = [];

  if (parameters['type'] != null) {
    setStatements.push(`WAREHOUSE_TYPE = '${parameters['type']}'`);
  }
  if (parameters['size'] != null) {
    setStatements.push(`WAREHOUSE_SIZE = '${parameters['size']}'`);
  }
  if (parameters['maxClusterCount'] != null) {
    setStatements.push(`MAX_CLUSTER_COUNT = ${parameters['maxClusterCount']}`);
  }
  if (parameters['minClusterCount'] != null) {
    setStatements.push(`MIN_CLUSTER_COUNT = ${parameters['minClusterCount']}`);
  }
  if (parameters['scalingPolicy'] != null) {
    setStatements.push(`SCALING_POLICY = '${parameters['scalingPolicy']}'`);
  }
  if (parameters['autoSuspend'] != null) {
    setStatements.push(`AUTO_SUSPEND = ${parameters['autoSuspend']}`);
  }
  if (parameters['autoResume'] != null) {
    setStatements.push(`AUTO_RESUME = ${parameters['autoResume']}`);
  }
  if (parameters['resourceMonitor'] != null) {
    setStatements.push(`RESOURCE_MONITOR = '${parameters['resourceMonitor']}'`);
  }
  if (parameters['enableQueryAcceleration'] != null) {
    setStatements.push(
      `ENABLE_QUERY_ACCELERATION = ${parameters['enableQueryAcceleration']}`,
    );
  }
  if (parameters['queryAccelerationMaxScaleFactor'] != null) {
    setStatements.push(
      `QUERY_ACCELERATION_MAX_SCALE_FACTOR = ${parameters['queryAccelerationMaxScaleFactor']}`,
    );
  }
  if (parameters['maxConcurrencyLevel'] != null) {
    setStatements.push(
      `MAX_CONCURRENCY_LEVEL = ${parameters['maxConcurrencyLevel']}`,
    );
  }
  if (parameters['statementQueuedTimeoutInSeconds'] != null) {
    setStatements.push(
      `STATEMENT_QUEUED_TIMEOUT_IN_SECONDS = ${parameters['statementQueuedTimeoutInSeconds']}`,
    );
  }
  if (parameters['statementTimeoutInSeconds'] != null) {
    setStatements.push(
      `STATEMENT_TIMEOUT_IN_SECONDS = ${parameters['statementTimeoutInSeconds']}`,
    );
  }
  if (parameters['comment'] != null) {
    setStatements.push(`COMMENT = '${parameters['comment']}'`);
  }

  if (setStatements.length === 0) {
    throw new Error(
      'At least one parameter must be specified to modify the warehouse',
    );
  }

  return `ALTER WAREHOUSE "${warehouseName}" SET ${setStatements.join(', ')}`;
}
