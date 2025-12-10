import {
  ApplicationError,
  BlockSyncMode,
  ErrorCode,
  isNil,
  OpsEdition,
} from '@openops/shared';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import {
  AppSystemProp,
  SharedSystemProp,
  SystemProp,
  WorkerSystemProps,
} from './system-prop';

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
  [AppSystemProp.DB_SYNCHRONIZE_SCHEMA]: 'false',
  [AppSystemProp.EDITION]: OpsEdition.COMMUNITY,
  [SharedSystemProp.CONTAINER_TYPE]: ContainerType.WORKER_AND_APP,
  [AppSystemProp.EXECUTION_DATA_RETENTION_DAYS]: '30',
  [AppSystemProp.BLOCKS_SYNC_MODE]: BlockSyncMode.NONE,
  [AppSystemProp.TRIGGER_FAILURES_THRESHOLD]: '576',
  [AppSystemProp.RUN_DB_MIGRATIONS]: 'true',
  [WorkerSystemProps.FLOW_WORKER_CONCURRENCY]: '10',
  [WorkerSystemProps.POLLING_POOL_SIZE]: '5',
  [WorkerSystemProps.SCHEDULED_WORKER_CONCURRENCY]: '10',
  [SharedSystemProp.LOG_LEVEL]: 'info',
  [SharedSystemProp.LOG_PRETTY]: 'false',
  [SharedSystemProp.LOG_REDACTION]: 'true',
  [SharedSystemProp.PACKAGE_ARCHIVE_PATH]: 'cache/archives',
  [SharedSystemProp.BLOCKS_SOURCE]: BlocksSource.FILE,
  [SharedSystemProp.BLOCK_CACHE_ENABLED]: 'true',
  [SharedSystemProp.BLOCKS_HOT_RELOAD_ENABLED]: 'false',
  [SharedSystemProp.BLOCKS_BUILDER_ENABLED]: 'false',
  [AppSystemProp.QUEUE_MODE]: QueueMode.REDIS,
  [SharedSystemProp.FLOW_TIMEOUT_SECONDS]: '600',
  [SharedSystemProp.TRIGGER_TIMEOUT_SECONDS]: '120',
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
  [AppSystemProp.SEED_DEV_DATA]: 'false',
  [SharedSystemProp.ENABLE_HOST_SESSION]: 'false',
  [SharedSystemProp.ENGINE_QUEUE_UPDATES_ENABLED]: 'true',
  [SharedSystemProp.ENGINE_METADATA_CACHE_ENABLED]: 'true',
  [SharedSystemProp.FAST_SHUTDOWN_ENABLED]: 'false',
  [SharedSystemProp.REQUIRE_ENGINE_VALIDATE_AUTH]: 'true',
  [SharedSystemProp.SHOW_DEV_MODE_WARNING]: 'false',
  [AppSystemProp.AZURE_API_VERSION]: '2024-07-01',
  [SharedSystemProp.INTERNAL_OAUTH_PROXY_URL]: 'https://oauth.openops.com',
  [AppSystemProp.CODE_BLOCK_MEMORY_LIMIT_IN_MB]: '128',
  [AppSystemProp.AI_PROMPTS_LOCATION]:
    'https://raw.githubusercontent.com/openops-cloud/openops/main/ai-prompts',
  [AppSystemProp.SUPERSET_MCP_SERVER_PATH]: '/root/.mcp/superset',
  [AppSystemProp.DOCS_MCP_SERVER_PATH]: '/root/.mcp/docs.openops.com',
  [AppSystemProp.LOAD_EXPERIMENTAL_MCP_TOOLS]: 'false',
  [SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE]: 'false',
  [AppSystemProp.OPENOPS_MCP_SERVER_PATH]: '/root/.mcp/openops-mcp',
  [AppSystemProp.AWS_MCP_COST_PATH]: '/root/.mcp/aws-cost',
  [AppSystemProp.SAMPLE_DATA_SIZE_LIMIT_KB]: '100',
  [AppSystemProp.REQUEST_BODY_LIMIT]: '10',
  [SharedSystemProp.LANGFUSE_HOST]: 'https://us.cloud.langfuse.com',
  [AppSystemProp.MAX_LLM_CALLS_WITHOUT_INTERACTION]: '100',
  [AppSystemProp.LLM_CHAT_EXPIRE_TIME_SECONDS]: '2592000', // 30 days
  [AppSystemProp.TELEMETRY_MODE]: 'COLLECTOR',
  [AppSystemProp.TELEMETRY_COLLECTOR_URL]: 'https://telemetry.openops.com/save',
  [SharedSystemProp.ENABLE_HOST_VALIDATION]: 'true',
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
  calculateConfigurationHash(): string {
    const props = Object.keys(SharedSystemProp)
      .sort()
      .map((key) => `${key}=${system.get(key as SystemProp)}`)
      .join(';');
    return crypto
      .createHash('sha256')
      .update(props)
      .digest('base64url')
      .slice(0, 12);
  },
};

const getEnvVar = (prop: SystemProp): string | undefined => {
  return process.env[`OPS_${prop}`] ?? systemPropDefaultValues[prop];
};
