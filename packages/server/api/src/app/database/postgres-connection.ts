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
