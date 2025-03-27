import {
  ApplicationError,
  BlockSyncMode,
  ErrorCode,
  isNil,
  OpsEdition,
} from '@openops/shared';
import os from 'os';
import path from 'path';
import {
  AppSystemProp,
  SharedSystemProp,
  SystemProp,
  WorkerSystemProps,
} from './system-prop';

export enum CopilotInstanceTypes {
  AZURE_OPENAI = 'AZURE_OPENAI',
  OPENAI = 'OPENAI',
}

export enum BlocksSource {
  /**
   * @deprecated Use `DB`, as `CLOUD_AND_DB` is no longer supported.
   */
  CLOUD_AND_DB = 'CLOUD_AND_DB',
  DB = 'DB',
  FILE = 'FILE',
}

export enum ContainerType {
  WORKER = 'WORKER',
  APP = 'APP',
  WORKER_AND_APP = 'WORKER_AND_APP',
}

export enum QueueMode {
  REDIS = 'REDIS',
  MEMORY = 'MEMORY',
}

export enum DatabaseType {
  POSTGRES = 'POSTGRES',
  SQLITE3 = 'SQLITE3',
}

const systemPropDefaultValues: Partial<Record<SystemProp, string>> = {
  [AppSystemProp.API_RATE_LIMIT_AUTHN_ENABLED]: 'true',
  [AppSystemProp.API_RATE_LIMIT_AUTHN_MAX]: '50',
  [AppSystemProp.API_RATE_LIMIT_AUTHN_WINDOW]: '1 minute',
  [AppSystemProp.CLIENT_REAL_IP_HEADER]: 'x-real-ip',
  [AppSystemProp.CLOUD_AUTH_ENABLED]: 'true',
  [AppSystemProp.CONFIG_PATH]: path.join(os.homedir(), '.openops'),
  [AppSystemProp.DB_TYPE]: DatabaseType.POSTGRES,
  [AppSystemProp.EDITION]: OpsEdition.COMMUNITY,
  [SharedSystemProp.CONTAINER_TYPE]: ContainerType.WORKER_AND_APP,
  [AppSystemProp.EXECUTION_DATA_RETENTION_DAYS]: '30',
  [AppSystemProp.BLOCKS_SYNC_MODE]: BlockSyncMode.NONE,
  [AppSystemProp.COPILOT_INSTANCE_TYPE]: CopilotInstanceTypes.OPENAI,
  [AppSystemProp.AZURE_OPENAI_API_VERSION]: '2023-06-01-preview',
  [AppSystemProp.TRIGGER_FAILURES_THRESHOLD]: '576',
  [SharedSystemProp.ENVIRONMENT]: 'prod',
  [WorkerSystemProps.FLOW_WORKER_CONCURRENCY]: '10',
  [WorkerSystemProps.POLLING_POOL_SIZE]: '5',
  [WorkerSystemProps.SCHEDULED_WORKER_CONCURRENCY]: '10',
  [SharedSystemProp.LOG_LEVEL]: 'info',
  [SharedSystemProp.LOG_PRETTY]: 'false',
  [SharedSystemProp.PACKAGE_ARCHIVE_PATH]: 'cache/archives',
  [SharedSystemProp.BLOCKS_SOURCE]: BlocksSource.FILE,
  [AppSystemProp.QUEUE_MODE]:
    process.env['NODE_ENV'] === 'test' ? QueueMode.MEMORY : QueueMode.REDIS,
  [SharedSystemProp.FLOW_TIMEOUT_SECONDS]: '600',
  [SharedSystemProp.TRIGGER_TIMEOUT_SECONDS]: '60',
  [AppSystemProp.TEMPLATES_SOURCE_URL]: '/api/v1/flow-templates',
  [AppSystemProp.TRIGGER_DEFAULT_POLL_INTERVAL]: '5',
  [AppSystemProp.MAX_CONCURRENT_JOBS_PER_PROJECT]: '100',
  [AppSystemProp.PROJECT_RATE_LIMITER_ENABLED]: 'false',
  [SharedSystemProp.LOGZIO_TOKEN]: '',
  [SharedSystemProp.LOGZIO_METRICS_TOKEN]: '',
  [SharedSystemProp.ENVIRONMENT_NAME]: 'local',
  [SharedSystemProp.COMPONENT]: '',
  [SharedSystemProp.VERSION]: 'local',
  [SharedSystemProp.OPENOPS_TABLES_VERSION]: 'local',
  [SharedSystemProp.ANALYTICS_VERSION]: 'local',
  [SharedSystemProp.EXECUTION_MODE]: 'SANDBOX_CODE_ONLY',
  [AppSystemProp.JWT_TOKEN_LIFETIME_HOURS]: '168',
  [AppSystemProp.DARK_THEME_ENABLED]: 'false',
  [AppSystemProp.SHOW_DEMO_HOME_PAGE]: 'false',
  [SharedSystemProp.ENABLE_HOST_SESSION]: 'false',
  [AppSystemProp.AZURE_API_VERSION]: '2024-07-01',
  [SharedSystemProp.INTERNAL_OAUTH_PROXY_URL]: 'https://oauth.openops.com',
  [AppSystemProp.CODE_BLOCK_MEMORY_LIMIT_IN_MB]: '128',
};

export const system = {
  get<T extends string>(prop: SystemProp): T | undefined {
    return getEnvVar(prop) as T | undefined;
  },

  getNumberOrThrow(prop: SystemProp): number {
    const value = system.getNumber(prop);

    if (isNil(value)) {
      throw new ApplicationError(
        {
          code: ErrorCode.SYSTEM_PROP_NOT_DEFINED,
          params: {
            prop,
          },
        },
        `System property OPS_${prop} is not defined, please check the documentation`,
      );
    }
    return value;
  },
  getNumber(prop: SystemProp): number | null {
    const stringNumber = getEnvVar(prop);

    if (!stringNumber) {
      return null;
    }

    const parsedNumber = Number.parseInt(stringNumber, 10);

    if (Number.isNaN(parsedNumber)) {
      return null;
    }

    return parsedNumber;
  },

  getBoolean(prop: SystemProp): boolean | undefined {
    const value = getEnvVar(prop);

    if (isNil(value)) {
      return undefined;
    }
    return value === 'true';
  },

  getList(prop: SystemProp): string[] {
    const values = getEnvVar(prop);

    if (isNil(values)) {
      return [];
    }
    return values.split(',').map((value) => value.trim());
  },

  getOrThrow<T extends string>(prop: SystemProp): T {
    const value = getEnvVar(prop) as T | undefined;

    if (value === undefined) {
      throw new ApplicationError(
        {
          code: ErrorCode.SYSTEM_PROP_NOT_DEFINED,
          params: {
            prop,
          },
        },
        `System property OPS_${prop} is not defined, please check the documentation`,
      );
    }

    return value;
  },
  getEdition(): OpsEdition {
    return this.getOrThrow<OpsEdition>(AppSystemProp.EDITION);
  },
  isWorker(): boolean {
    return [ContainerType.WORKER, ContainerType.WORKER_AND_APP].includes(
      this.getOrThrow<ContainerType>(SharedSystemProp.CONTAINER_TYPE),
    );
  },
  isApp(): boolean {
    return [ContainerType.APP, ContainerType.WORKER_AND_APP].includes(
      this.getOrThrow<ContainerType>(SharedSystemProp.CONTAINER_TYPE),
    );
  },
};

const getEnvVar = (prop: SystemProp): string | undefined => {
  return process.env[`OPS_${prop}`] ?? systemPropDefaultValues[prop];
};
