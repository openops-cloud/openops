import {
  AppSystemProp,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import { EnvironmentType, isNil } from '@openops/shared';
import { TlsOptions } from 'node:tls';
import { DataSource, MigrationInterface } from 'typeorm';
import { commonProperties } from './database-connection';
import { InitializePostgresSchema1740463047000 } from './migrations/1740463047000-InitializePostgresSchema';
import { AddUserSettings1740734879653 } from './migrations/1740734879653-AddUserSettings';
import { AddColumnForStartupTemplates1741016911542 } from './migrations/1741016911542-AddColumnForStartupTemplates';
import { RenamePieceToBlockMigration1741475952000 } from './migrations/1741475952000-RenamePieceToBlock';
import { AddVersionToTemplates1741636646000 } from './migrations/1741636646000-AddVersionToTemplates';
import { ReplaceSelectOptionsIdsWithNames1741945618000 } from './migrations/1741945618000-ReplaceSelectOptionsIdsWithNames';
import { CreateAiConfigTable1744641502000 } from './migrations/1744641502000-CreateAiConfigTable';
import { AddProviderSettingsAndConstraintForAiConfig1745309649736 } from './migrations/1745309649736-AddProviderSettingsAndConstraintForAiConfig';
import { AddFlowStepTestOutputTable1746454781866 } from './migrations/1746454781866-AddFlowStepTestOutputTable';
import { AddStepIdToExistingFlowVersionsAndInsertOutputInTestOutputTable1746454781866 } from './migrations/1746618034190-AddStepIdToExistingFlowVersionsAndInsertOutputInTestOutputTable';
import { AddTemplateCategories1748356358052 } from './migrations/1748356358052-AddTemplateCategories';
import { AddProviderToAppConnectionTable1748356358053 } from './migrations/1748356358053-AddProviderToAppConnectionTable';
import { AddAuthProviderKeyToAppConnectionTable1749066895522 } from './migrations/1749066895522-AddAuthProviderKeyToAppConnectionTable';
import { AddAuthProviderKeyToExistingAppConnections1749111073431 } from './migrations/1749111073431-AddAuthProviderKeyToExistingAppConnections';
import { AddStepIdToExistingFlowVersions1749644220381 } from './migrations/1749644220381-AddStepIdToExistingFlowVersions';
import { CreateMcpConfigTable1749644220382 } from './migrations/1749644220382-CreateMcpConfigTable';
import { SetBlockNameAsNullableInConnectionsTable1749809813762 } from './migrations/1749809813762-SetBlockNameAsNullableInConnectionsTable';
import { RemoveBlockNameFromConnectionsTable1750161024797 } from './migrations/1750161024797-RemoveBlockNameFromConnectionsTable';
import { AddInputToTestOutputTable1750933522145 } from './migrations/1750933522145-AddInputToTestOutputTable';
import { AddInputToTriggerEventTable1751282188913 } from './migrations/1751282188913-AddInputToTriggerEventTable';
import { AddSuccessToFlowStepTestOutputTable1752487641303 } from './migrations/1752487641303-AddSuccessToFlowStepTestOutputTable';
import { UpdateUmbrellaRecommendationTypesAcrossFlowVersions1752758891771 } from './migrations/1752758891771-UpdateUmbrellaRecommendationTypesAcrossFlowVersions';
import { AddTriggerSourceToFlowRun1754489349007 } from './migrations/1754489349007-AddTriggerSourceToFlowRun';
import { MigrateStepTestOutputToNewCompressionAlgorithm1755942417309 } from './migrations/1755942417309-MigrateStepTestOutputToNewCompressionAlgorithm';
import { AddIsWorkflowToFlowTable1756298583000 } from './migrations/1756298583000-AddIsWorkflowToFlowTable';

const getSslConfig = (): boolean | TlsOptions => {
  const useSsl = system.get(AppSystemProp.POSTGRES_USE_SSL);

  if (useSsl === 'true') {
    return {
      ca: system.get(AppSystemProp.POSTGRES_SSL_CA)?.replace(/\\n/g, '\n'),
    };
  }

  return false;
};

const getMigrations = (): (new () => MigrationInterface)[] => {
  return [
    InitializePostgresSchema1740463047000,
    AddUserSettings1740734879653,
    AddColumnForStartupTemplates1741016911542,
    RenamePieceToBlockMigration1741475952000,
    AddVersionToTemplates1741636646000,
    ReplaceSelectOptionsIdsWithNames1741945618000,
    CreateAiConfigTable1744641502000,
    AddProviderSettingsAndConstraintForAiConfig1745309649736,
    AddFlowStepTestOutputTable1746454781866,
    AddStepIdToExistingFlowVersionsAndInsertOutputInTestOutputTable1746454781866,
    AddTemplateCategories1748356358052,
    AddProviderToAppConnectionTable1748356358053,
    AddAuthProviderKeyToAppConnectionTable1749066895522,
    AddAuthProviderKeyToExistingAppConnections1749111073431,
    AddStepIdToExistingFlowVersions1749644220381,
    CreateMcpConfigTable1749644220382,
    SetBlockNameAsNullableInConnectionsTable1749809813762,
    RemoveBlockNameFromConnectionsTable1750161024797,
    AddInputToTestOutputTable1750933522145,
    AddInputToTriggerEventTable1751282188913,
    AddSuccessToFlowStepTestOutputTable1752487641303,
    UpdateUmbrellaRecommendationTypesAcrossFlowVersions1752758891771,
    AddTriggerSourceToFlowRun1754489349007,
    MigrateStepTestOutputToNewCompressionAlgorithm1755942417309,
    AddIsWorkflowToFlowTable1756298583000,
  ];
};

const getMigrationConfig = (): MigrationConfig => {
  const env = system.getOrThrow<EnvironmentType>(SharedSystemProp.ENVIRONMENT);

  if (env === EnvironmentType.TESTING) {
    return {};
  }

  return {
    migrationsRun: true,
    migrationsTransactionMode: 'each',
    migrations: getMigrations(),
  };
};

export const createPostgresDataSource = (): DataSource => {
  const migrationConfig = getMigrationConfig();
  const url = system.get(AppSystemProp.POSTGRES_URL);

  if (!isNil(url)) {
    return new DataSource({
      type: 'postgres',
      url,
      ssl: getSslConfig(),
      ...migrationConfig,
      ...commonProperties,
    });
  }

  const database = system.getOrThrow(AppSystemProp.POSTGRES_DATABASE);
  const host = system.getOrThrow(AppSystemProp.POSTGRES_HOST);
  const password = system.getOrThrow(AppSystemProp.POSTGRES_PASSWORD);
  const serializedPort = system.getOrThrow(AppSystemProp.POSTGRES_PORT);
  const port = Number.parseInt(serializedPort, 10);
  const username = system.getOrThrow(AppSystemProp.POSTGRES_USERNAME);

  return new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    ssl: getSslConfig(),
    ...migrationConfig,
    ...commonProperties,
  });
};

type MigrationConfig = {
  migrationsRun?: boolean;
  migrationsTransactionMode?: 'all' | 'none' | 'each';
  migrations?: (new () => MigrationInterface)[];
};
