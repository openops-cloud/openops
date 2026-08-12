import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializePostgresSchema1740463047000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const userTableExistsQueryResponse: { exists: boolean }[] =
      await queryRunner.query(
        `SELECT exists (
            SELECT FROM information_schema.tables
              WHERE  table_schema = 'public'
              AND    table_name   = 'user'
          )`,
      );

    const userTableExists =
      userTableExistsQueryResponse &&
      userTableExistsQueryResponse.length > 0 &&
      userTableExistsQueryResponse[0].exists;

    if (userTableExists) {
      logger.info('User table exists, skipping schema initialization');
      return;
    }

    await queryRunner.query(`
      create table if not exists flag
      (
          id      varchar(21)                            not null
              constraint "PK_17b74257294fdfd221178a132d4"
                  primary key,
          created timestamp with time zone default now() not null,
          updated timestamp with time zone default now() not null,
          value   jsonb                                  not null
      );

      create table if not exists "store-entry"
      (
          id          varchar(21)                            not null
              constraint "PK_afb44ca7c0b4606b19deb1680d6"
                  primary key,
          created     timestamp with time zone default now() not null,
          updated     timestamp with time zone default now() not null,
          key         varchar(128)                           not null,
          "projectId" varchar(21)                            not null,
          value       jsonb,
          constraint uq_projectid_and_key
              unique ("projectId", key)
      );

      create table if not exists "user"
      (
          id                 varchar(21)                            not null
              constraint "PK_cace4a159ff9f2512dd42373760"
                  primary key,
          created            timestamp with time zone default now() not null,
          updated            timestamp with time zone default now() not null,
          email              varchar                                not null
              constraint "UQ_user_email"
                  unique,
          "firstName"        varchar                                not null,
          "lastName"         varchar                                not null,
          password           varchar                                not null,
          status             varchar                                not null,
          "trackEvents"      boolean,
          "newsLetter"       boolean,
          "externalId"       varchar,
          verified           boolean                                not null,
          "organizationId"   varchar(21),
          "organizationRole" varchar                                not null
      );

      create table if not exists project
      (
          id                 varchar(21)                            not null
              constraint "PK_4d68b1358bb5b766d3e78f32f57"
                  primary key,
          created            timestamp with time zone default now() not null,
          updated            timestamp with time zone default now() not null,
          "ownerId"          varchar(21)                            not null
              constraint fk_project_owner_id
                  references "user",
          "displayName"      varchar                                not null,
          "notifyStatus"     varchar,
          "externalId"       varchar,
          deleted            timestamp with time zone,
          "organizationId"   varchar(21)                            not null,
          "tablesDatabaseId" integer                                not null
      );

      create table if not exists file
      (
          id               varchar(21)                                                   not null
              constraint "PK_36b46d232307066b3a2c9ea3a1d"
                  primary key,
          created          timestamp with time zone default now()                        not null,
          updated          timestamp with time zone default now()                        not null,
          "projectId"      varchar(21)
              constraint fk_file_project_id
                  references project
                  on delete cascade,
          data             bytea                                                         not null,
          type             varchar                  default 'UNKNOWN'::character varying not null,
          compression      varchar                  default 'NONE'::character varying    not null,
          "organizationId" varchar(21)
      );

      create index if not exists idx_file_project_id
          on file ("projectId");
      create index if not exists idx_file_type_created_desc
          on file (type, created);
      create index if not exists idx_project_owner_id
          on project ("ownerId");
      create unique index if not exists idx_user_organization_id_email
          on "user" ("organizationId", email);
      create table if not exists app_connection
      (
          id          varchar(21)                                                  not null
              constraint "PK_9efa2d6633ecc57cc5adeafa039"
                  primary key,
          created     timestamp with time zone default now()                       not null,
          updated     timestamp with time zone default now()                       not null,
          name        varchar                                                      not null,
          "pieceName" varchar                                                      not null,
          "projectId" varchar(21)                                                  not null
              constraint fk_app_connection_app_project_id
                  references project
                  on delete cascade,
          value       jsonb                                                        not null,
          type        varchar                                                      not null,
          status      varchar                  default 'ACTIVE'::character varying not null
      );

      create unique index if not exists idx_app_connection_project_id_and_name
          on app_connection ("projectId", name);
      create table if not exists connection_key
      (
          id          varchar(21)                            not null
              constraint "PK_4dcf1d9ae4ba5eb261a6c775ad2"
                  primary key,
          created     timestamp with time zone default now() not null,
          updated     timestamp with time zone default now() not null,
          "projectId" varchar(21)                            not null
              constraint "FK_03177dc6779e6e147866d43c050"
                  references project,
          settings    jsonb                                  not null
      );

      create index if not exists idx_connection_key_project_id
          on connection_key ("projectId");
      create table if not exists app_event_routing
      (
          id                varchar(21)                            not null
              constraint "PK_2107df2b2faf9d50435f9d5acd7"
                  primary key,
          created           timestamp with time zone default now() not null,
          updated           timestamp with time zone default now() not null,
          "appName"         varchar                                not null,
          "projectId"       varchar(21)                            not null,
          "flowId"          varchar(21)                            not null,
          "identifierValue" varchar                                not null,
          event             varchar                                not null
      );

      create index if not exists idx_app_event_routing_flow_id
          on app_event_routing ("flowId");
      create unique index if not exists "idx_app_event_flow_id_project_id_appName_identifier_value_event"
          on app_event_routing ("appName", "projectId", "flowId", "identifierValue", event);
      create table if not exists webhook_simulation
      (
          id          varchar(21)                            not null
              constraint "PK_6854a1ac9a5b24810b29aaf0f43"
                  primary key,
          created     timestamp with time zone default now() not null,
          updated     timestamp with time zone default now() not null,
          "flowId"    varchar(21)                            not null,
          "projectId" varchar(21)                            not null
      );

      create unique index if not exists idx_webhook_simulation_flow_id
          on webhook_simulation ("flowId");
      create table if not exists folder
      (
          id               varchar(21)                            not null
              constraint "PK_6278a41a706740c94c02e288df8"
                  primary key,
          created          timestamp with time zone default now() not null,
          updated          timestamp with time zone default now() not null,
          "displayName"    varchar                                not null,
          "projectId"      varchar(21)                            not null
              constraint fk_folder_project
                  references project
                  on delete cascade,
          "parentFolderId" varchar(21)
              constraint fk_folder_parent_folder
                  references folder
                  on delete cascade
      );

      create table if not exists flow
      (
          id                   varchar(21)                                                    not null
              constraint "PK_6c2ad4a3e86394cd9bb7a80a228"
                  primary key,
          created              timestamp with time zone default now()                         not null,
          updated              timestamp with time zone default now()                         not null,
          "projectId"          varchar(21)                                                    not null
              constraint fk_flow_project_id
                  references project
                  on delete cascade,
          "folderId"           varchar(21)
              constraint fk_flow_folder_id
                  references folder
                  on delete set null,
          status               varchar                  default 'DISABLED'::character varying not null,
          schedule             jsonb,
          "publishedVersionId" varchar(21)
              constraint "UQ_f6608fe13b916017a8202f993cb"
                  unique
      );

      create index if not exists idx_flow_project_id
          on flow ("projectId");
      create index if not exists idx_flow_folder_id
          on flow ("folderId");
      create table if not exists flow_version
      (
          id            varchar(21)                            not null
              constraint "PK_2f20a52dcddf98d3fafe621a9f5"
                  primary key,
          created       timestamp with time zone default now() not null,
          updated       timestamp with time zone default now() not null,
          "flowId"      varchar(21)                            not null
              constraint fk_flow_version_flow
                  references flow
                  on delete cascade,
          "displayName" varchar                                not null,
          trigger       jsonb,
          valid         boolean                                not null,
          state         varchar                                not null,
          "updatedBy"   varchar
              constraint fk_updated_by_user_flow
                  references "user"
                  on delete set null,
          description   varchar
      );

      alter table flow
          add constraint fk_flow_published_version
              foreign key ("publishedVersionId") references flow_version
                  on delete restrict;
      create index if not exists idx_flow_version_flow_id
          on flow_version ("flowId");
      create table if not exists flow_run
      (
          id                  varchar(21)                            not null
              constraint "PK_858b1dd0d1055c44261ae00d45b"
                  primary key,
          created             timestamp with time zone default now() not null,
          updated             timestamp with time zone default now() not null,
          "projectId"         varchar(21)                            not null
              constraint fk_flow_run_project_id
                  references project
                  on delete cascade,
          "flowId"            varchar(21)                            not null
              constraint fk_flow_run_flow_id
                  references flow
                  on delete cascade,
          "flowVersionId"     varchar(21)                            not null,
          environment         varchar,
          "flowDisplayName"   varchar                                not null,
          "logsFileId"        varchar(21)
              constraint fk_flow_run_logs_file_id
                  references file
                  on delete set null,
          status              varchar                                not null,
          "startTime"         timestamp with time zone               not null,
          "finishTime"        timestamp with time zone,
          "pauseMetadata"     jsonb,
          tasks               integer,
          tags                character varying[],
          "terminationReason" varchar,
          duration            integer
      );

      create index if not exists idx_run_project_id_environment_created_desc
          on flow_run ("projectId" asc, environment asc, created desc);
      create index if not exists idx_run_project_id_environment_status_created_desc
          on flow_run ("projectId" asc, environment asc, status asc, created desc);
      create index if not exists idx_run_project_id_flow_id_environment_created_desc
          on flow_run ("projectId" asc, "flowId" asc, environment asc, created desc);
      create index if not exists idx_run_project_id_flow_id_environment_status_created_desc
          on flow_run ("projectId" asc, "flowId" asc, environment asc, status asc, created desc);
      create index if not exists idx_run_logs_file_id
          on flow_run ("logsFileId");
      create table if not exists trigger_event
      (
          id           varchar(21)                            not null
              constraint "PK_79bbc8c2af95776e801c7eaab11"
                  primary key,
          created      timestamp with time zone default now() not null,
          updated      timestamp with time zone default now() not null,
          "flowId"     varchar(21)                            not null
              constraint fk_trigger_event_flow_id
                  references flow
                  on delete cascade,
          "projectId"  varchar(21)                            not null
              constraint fk_trigger_event_project_id
                  references project
                  on delete cascade,
          "sourceName" varchar                                not null,
          payload      jsonb
      );

      create index if not exists idx_trigger_event_flow_id
          on trigger_event ("flowId");
      create unique index if not exists idx_folder_project_id_display_name
          on folder ("projectId", "displayName");
      create table if not exists "DELETED_flow_instance"
      (
          id              varchar(21)                            not null
              constraint "PK_5b0308060b7de5abec61ac5d2db"
                  primary key,
          created         timestamp with time zone default now() not null,
          updated         timestamp with time zone default now() not null,
          "projectId"     varchar(21)                            not null,
          "flowId"        varchar(21)                            not null
              constraint "REL_cb897f5e48cc3cba1418966326"
                  unique
              constraint fk_flow_instance_flow
                  references flow
                  on delete cascade,
          "flowVersionId" varchar(21)                            not null
              constraint "REL_ec72f514c21734fb7a08797d75"
                  unique
              constraint fk_flow_instance_flow_version
                  references flow_version
                  on delete cascade,
          status          varchar                                not null,
          schedule        jsonb
      );

      create unique index if not exists idx_flow_instance_project_id_flow_id
          on "DELETED_flow_instance" ("projectId", "flowId");
      create table if not exists piece_metadata
      (
          id                        varchar(21)                            not null
              constraint "PK_b045821e9caf2be9aba520d96da"
                  primary key,
          created                   timestamp with time zone default now() not null,
          updated                   timestamp with time zone default now() not null,
          name                      varchar                                not null,
          "displayName"             varchar                                not null,
          "logoUrl"                 varchar                                not null,
          description               varchar,
          version                   varchar                                not null,
          "minimumSupportedRelease" varchar                                not null,
          "maximumSupportedRelease" varchar                                not null,
          actions                   json                                   not null,
          triggers                  json                                   not null,
          "projectId"               varchar
              constraint fk_piece_metadata_project_id
                  references project
                  on delete cascade,
          auth                      json,
          "pieceType"               varchar                                not null,
          "packageType"             varchar                                not null,
          "archiveId"               varchar(21)
              constraint "UQ_b43d7b070f0fc309932d4cf0165"
                  unique
              constraint fk_piece_metadata_file
                  references file,
          categories                character varying[],
          authors                   character varying[]                    not null,
          "projectUsage"            integer                  default 0     not null,
          "organizationId"          varchar(21)
      );

      create unique index if not exists idx_piece_metadata_name_project_id_version
          on piece_metadata (name, version collate "en_US.utf8", "projectId");
      create table if not exists alert
      (
          id          varchar(21)                            not null
              primary key,
          created     timestamp with time zone default now() not null,
          updated     timestamp with time zone default now() not null,
          "projectId" varchar(21)                            not null,
          channel     varchar                                not null,
          receiver    varchar                                not null
      );

      create table if not exists worker_machine
      (
          id          varchar(21)                            not null
              constraint "PK_9d6b1b7507214e3480582ef32e7"
                  primary key,
          created     timestamp with time zone default now() not null,
          updated     timestamp with time zone default now() not null,
          type        varchar                                not null,
          information jsonb                                  not null
      );

      create table if not exists organization
      (
          id                  varchar(21)                            not null
              constraint "PK_organizationId"
                  primary key,
          created             timestamp with time zone default now() not null,
          updated             timestamp with time zone default now() not null,
          "ownerId"           varchar(21)                            not null
              constraint "REL_4e52acb5c47b4731acf6ce5d4916e1"
                  unique
              constraint fk_organization_user
                  references "user"
                  on update restrict on delete restrict,
          name                varchar                                not null,
          "tablesWorkspaceId" integer                                not null
      );

      create table if not exists flow_template
      (
          id                 varchar(21)                            not null
              constraint pk_flow_template_id
                  primary key,
          created            timestamp with time zone default now() not null,
          updated            timestamp with time zone default now() not null,
          name               varchar(255)                           not null,
          description        text                                   not null,
          type               varchar(255)                           not null,
          tags               jsonb                                  not null,
          services           jsonb                                  not null,
          domains            jsonb                                  not null,
          pieces             jsonb                                  not null,
          template           jsonb                                  not null,
          "projectId"        varchar(21)
              references project,
          "organizationId"   varchar(21)
              references organization,
          "isSample"         boolean                  default false not null
      );
       `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Not implemented');
  }
}
