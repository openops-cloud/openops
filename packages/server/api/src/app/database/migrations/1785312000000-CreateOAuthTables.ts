import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOAuthTables1785312000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('CreateOAuthTables1785312000000: starting');

    await queryRunner.query(`
      CREATE TABLE "oauth_signing_key" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "privateKeyEncrypted" text NOT NULL,
        "publicKeyPem" text NOT NULL,
        "status" varchar(16) NOT NULL,
        CONSTRAINT "PK_oauth_signing_key" PRIMARY KEY ("id")
      );
    `);

    // Guarantees concurrently booting replicas converge on a single active key.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_oauth_signing_key_single_active"
      ON "oauth_signing_key" ("status") WHERE "status" = 'active';
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_client" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "clientName" varchar(128) NOT NULL,
        "redirectUris" jsonb NOT NULL,
        "grantTypes" jsonb NOT NULL,
        "tokenEndpointAuthMethod" varchar(32) NOT NULL,
        "clientSecretHash" varchar(64),
        CONSTRAINT "PK_oauth_client" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_grant" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "clientId" varchar(21) NOT NULL,
        "userId" varchar(21) NOT NULL,
        "projectId" varchar(21) NOT NULL,
        "resourceId" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL,
        "lastUsedAt" timestamp with time zone,
        "revokedAt" timestamp with time zone,
        CONSTRAINT "PK_oauth_grant" PRIMARY KEY ("id"),
        CONSTRAINT "fk_oauth_grant_client" FOREIGN KEY ("clientId")
          REFERENCES "oauth_client" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_oauth_grant_user" FOREIGN KEY ("userId")
          REFERENCES "user" ("id") ON DELETE CASCADE
      );
    `);

    // Not unique: a user may hold several connections for the same client, each
    // from its own authorization and revocable on its own.
    await queryRunner.query(`
      CREATE INDEX "idx_oauth_grant_client_id_user_id"
      ON "oauth_grant" ("clientId", "userId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_oauth_grant_user_id" ON "oauth_grant" ("userId");
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_pending_authorization" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "clientId" varchar(21) NOT NULL,
        "redirectUri" varchar(512) NOT NULL,
        "codeChallenge" varchar(43) NOT NULL,
        "resource" varchar(512) NOT NULL,
        "scope" varchar(128) NOT NULL,
        "state" text,
        "expiresAt" timestamp with time zone NOT NULL,
        "consumedAt" timestamp with time zone,
        CONSTRAINT "PK_oauth_pending_authorization" PRIMARY KEY ("id"),
        CONSTRAINT "fk_oauth_pending_authorization_client" FOREIGN KEY ("clientId")
          REFERENCES "oauth_client" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_oauth_pending_authorization_expires_at"
      ON "oauth_pending_authorization" ("expiresAt");
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_authorization_code" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "codeHash" varchar(64) NOT NULL,
        "clientId" varchar(21) NOT NULL,
        "userId" varchar(21) NOT NULL,
        "redirectUri" varchar(512) NOT NULL,
        "codeChallenge" varchar(43) NOT NULL,
        "resource" varchar(512) NOT NULL,
        "scope" varchar(128) NOT NULL,
        "expiresAt" timestamp with time zone NOT NULL,
        "consumedAt" timestamp with time zone,
        CONSTRAINT "PK_oauth_authorization_code" PRIMARY KEY ("id"),
        CONSTRAINT "fk_oauth_authorization_code_client" FOREIGN KEY ("clientId")
          REFERENCES "oauth_client" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_oauth_authorization_code_code_hash"
      ON "oauth_authorization_code" ("codeHash");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_oauth_authorization_code_expires_at"
      ON "oauth_authorization_code" ("expiresAt");
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_refresh_token" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "grantId" varchar(21) NOT NULL,
        "familyId" varchar(21) NOT NULL,
        "clientId" varchar(21) NOT NULL,
        "resource" varchar(512) NOT NULL,
        "scope" varchar(128) NOT NULL,
        "expiresAt" timestamp with time zone NOT NULL,
        "revokedAt" timestamp with time zone,
        CONSTRAINT "PK_oauth_refresh_token" PRIMARY KEY ("id"),
        CONSTRAINT "fk_oauth_refresh_token_grant" FOREIGN KEY ("grantId")
          REFERENCES "oauth_grant" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_oauth_refresh_token_client" FOREIGN KEY ("clientId")
          REFERENCES "oauth_client" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_oauth_refresh_token_token_hash"
      ON "oauth_refresh_token" ("tokenHash");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_oauth_refresh_token_grant_id"
      ON "oauth_refresh_token" ("grantId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_oauth_refresh_token_family_id"
      ON "oauth_refresh_token" ("familyId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_oauth_refresh_token_expires_at"
      ON "oauth_refresh_token" ("expiresAt");
    `);

    logger.info('CreateOAuthTables1785312000000: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_refresh_token";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_authorization_code";`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "oauth_pending_authorization";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_grant";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_client";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_signing_key";`);
  }
}
