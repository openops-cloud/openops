import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBenchmarkAndBenchmarkFlowTables1764600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddBenchmarkAndBenchmarkFlowTables1764600000000: starting');

    await queryRunner.query(`
      CREATE TABLE "benchmark" (
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
        CONSTRAINT "PK_benchmark" PRIMARY KEY ("id"),
        CONSTRAINT "fk_benchmark_project" FOREIGN KEY ("projectId")
          REFERENCES "project" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_benchmark_folder" FOREIGN KEY ("folderId")
          REFERENCES "folder" ("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_benchmark_project_id_deleted_at"
      ON "benchmark" ("projectId", "deletedAt");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_benchmark_project_id_deleted_at_created_desc"
      ON "benchmark" ("projectId", "deletedAt", "created" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_benchmark_project_id_provider_deleted_at"
      ON "benchmark" ("projectId", "provider", "deletedAt");
    `);

    await queryRunner.query(`
      CREATE TABLE "benchmark_flow" (
        "id" varchar(21) NOT NULL,
        "created" timestamp with time zone DEFAULT now() NOT NULL,
        "updated" timestamp with time zone DEFAULT now() NOT NULL,
        "benchmarkId" varchar(21) NOT NULL,
        "flowId" varchar(21) NOT NULL,
        "isOrchestrator" boolean NOT NULL DEFAULT false,
        "displayName" varchar,
        "sortOrder" integer,
        "deletedAt" timestamp with time zone,
        CONSTRAINT "PK_benchmark_flow" PRIMARY KEY ("id"),
        CONSTRAINT "fk_benchmark_flow_benchmark" FOREIGN KEY ("benchmarkId")
          REFERENCES "benchmark" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_benchmark_flow_flow" FOREIGN KEY ("flowId")
          REFERENCES "flow" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_benchmark_flow_benchmark_id"
      ON "benchmark_flow" ("benchmarkId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_benchmark_flow_flow_id"
      ON "benchmark_flow" ("flowId");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_benchmark_flow_benchmark_id_flow_id"
      ON "benchmark_flow" ("benchmarkId", "flowId")
      WHERE "deletedAt" IS NULL;
    `);

    logger.info('AddBenchmarkAndBenchmarkFlowTables1764600000000: completed');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}
