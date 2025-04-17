import {
  AppSystemProp,
  DatabaseType,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { EnvironmentType, isNil } from '@openops/shared';
import {
  ArrayContains,
  DataSource,
  EntitySchema,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { AiConfigEntity } from '../ai/config/ai-config.entity';
import { AppConnectionEntity } from '../app-connection/app-connection.entity';
import { AppEventRoutingEntity } from '../app-event-routing/app-event-routing.entity';
import { BlockMetadataEntity } from '../blocks/block-metadata-entity';
import { FileEntity } from '../file/file.entity';
import { FlagEntity } from '../flags/flag.entity';
import { FlowTemplateEntity } from '../flow-template/flow-template.entity';
import { FlowRunEntity } from '../flows/flow-run/flow-run-entity';
import { FlowVersionEntity } from '../flows/flow-version/flow-version-entity';
import { FlowEntity } from '../flows/flow/flow.entity';
import { FolderEntity } from '../flows/folder/folder.entity';
import { TriggerEventEntity } from '../flows/trigger-events/trigger-event.entity';
import { OrganizationEntity } from '../organization/organization.entity';
import { ProjectEntity } from '../project/project-entity';
import { StoreEntryEntity } from '../store-entry/store-entry-entity';
import { UserSettingsEntity } from '../user-settings/user-settings-entity';
import { UserEntity } from '../user/user-entity';
import { WebhookSimulationEntity } from '../webhooks/webhook-simulation/webhook-simulation-entity';
import { WorkerMachineEntity } from '../workers/machine/machine-entity';
import { createPostgresDataSource } from './postgres-connection';
import { createSqlLiteDataSource } from './sqlite-connection';

const databaseType = system.get(AppSystemProp.DB_TYPE);

function getEntities(): EntitySchema<unknown>[] {
  const entities: EntitySchema[] = [
    TriggerEventEntity,
    AppEventRoutingEntity,
    FileEntity,
    FlagEntity,
    FlowEntity,
    FlowVersionEntity,
    FlowRunEntity,
    ProjectEntity,
    StoreEntryEntity,
    UserEntity,
    AppConnectionEntity,
    WebhookSimulationEntity,
    FolderEntity,
    BlockMetadataEntity,
    OrganizationEntity,
    WorkerMachineEntity,
    FlowTemplateEntity,
    UserSettingsEntity,
    AiConfigEntity,
  ];

  return entities;
}

const getSynchronize = (): boolean => {
  const env = system.getOrThrow<EnvironmentType>(SharedSystemProp.ENVIRONMENT);

  const value: Partial<Record<EnvironmentType, boolean>> = {
    [EnvironmentType.TESTING]: true,
  };

  return value[env] ?? false;
};

export const commonProperties = {
  subscribers: [],
  entities: getEntities(),
  synchronize: getSynchronize(),
};

let _databaseConnection: DataSource | null = null;

export const databaseConnection = () => {
  if (isNil(_databaseConnection)) {
    _databaseConnection =
      databaseType === DatabaseType.SQLITE3
        ? createSqlLiteDataSource()
        : createPostgresDataSource();
  }
  return _databaseConnection;
};

export function APArrayContains<T extends ObjectLiteral>(
  columnName: string,
  values: string[],
  query: SelectQueryBuilder<T>,
): SelectQueryBuilder<T> {
  const databaseType = system.get(AppSystemProp.DB_TYPE);
  switch (databaseType) {
    case DatabaseType.POSTGRES:
      return query.andWhere({
        [columnName]: ArrayContains(values),
      });
    case DatabaseType.SQLITE3: {
      const likeConditions = values
        .map((tag, index) => `flow_run.tags LIKE :tag${index}`)
        .join(' AND ');
      const likeParams = values.reduce((params, tag, index) => {
        return {
          ...params,
          [`tag${index}`]: `%${tag}%`,
        };
      }, {});
      return query.andWhere(likeConditions, likeParams);
    }
    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
}
