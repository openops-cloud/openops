import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssessmentTable1764600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddAssessmentTable1764600000000: starting');

    await queryRunner.query(`
      CREATE TABLE "assessment" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "projectId" varchar(21) NOT NULL,
        "provider" varchar NOT NULL,
        "folderId" varchar(21),
        "connectionId" varchar(21),
        "scope" jsonb,
        "deletedAt" timestamp with time zone,
        "lastRunId" varchar(21),
        CONSTRAINT "PK_assessment" PRIMARY KEY ("id"),
        CONSTRAINT "fk_assessment_project" FOREIGN KEY ("projectId")
          REFERENCES "project" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_assessment_folder" FOREIGN KEY ("folderId")
          REFERENCES "folder" ("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assessment_project_id_deleted_at"
      ON "assessment" ("projectId", "deletedAt");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assessment_project_id_deleted_at_created_desc"
      ON "assessment" ("projectId", "deletedAt", "created" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assessment_project_id_provider_deleted_at"
      ON "assessment" ("projectId", "provider", "deletedAt");
    `);

    await queryRunner.query(`
      CREATE TABLE "assessment_flow" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "assessmentId" varchar(21) NOT NULL,
        "flowId" varchar(21) NOT NULL,
        "isOrchestrator" boolean NOT NULL DEFAULT false,
        "displayName" varchar,
        "sortOrder" integer,
        "deletedAt" timestamp with time zone,
        CONSTRAINT "PK_assessment_flow" PRIMARY KEY ("id"),
        CONSTRAINT "fk_assessment_flow_assessment" FOREIGN KEY ("assessmentId")
          REFERENCES "assessment" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_assessment_flow_flow" FOREIGN KEY ("flowId")
          REFERENCES "flow" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assessment_flow_assessment_id"
      ON "assessment_flow" ("assessmentId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_assessment_flow_flow_id"
      ON "assessment_flow" ("flowId");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_assessment_flow_assessment_id_flow_id"
      ON "assessment_flow" ("assessmentId", "flowId")
      WHERE "deletedAt" IS NULL;
    `);

    logger.info('AddAssessmentTable1764600000000: completed');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
