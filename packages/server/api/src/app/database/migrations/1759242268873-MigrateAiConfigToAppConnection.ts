import { encryptUtils, logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateAiConfigToAppConnection1759242268873
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('MigrateAiConfigToAppConnection1759242268873: starting');

    await queryRunner.query(`
      ALTER TABLE "ai_config"
      ADD COLUMN IF NOT EXISTS "connection" character varying;
    `);

    const aiConfigs: Array<{
      id: string;
      projectId: string;
      provider?: string | null;
      model?: string | null;
      apiKey?: string | null;
      providerSettings?: Record<string, unknown> | null;
      modelSettings?: Record<string, unknown> | null;
      enabled?: boolean | null;
    }> = await queryRunner.query(`
      SELECT id, "projectId" , provider, model, "apiKey", "providerSettings", "modelSettings", enabled
      FROM "ai_config"
    `);

    for (const row of aiConfigs) {
      const existingConn: Array<{ connection: string | null }> =
        await queryRunner.query(
          `SELECT connection FROM "ai_config" WHERE id = $1`,
          [row.id],
        );
      if (existingConn?.[0]?.connection) continue;

      const providerSanitized = row.provider
        ? row.provider.trim().replace(/\s+/g, '-')
        : null;
      const baseName = providerSanitized ? `AI-${providerSanitized}` : 'AI';
      let name = baseName;
      let suffix = 1;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const conflict = await queryRunner.query(
          `SELECT 1 FROM "app_connection" WHERE "projectId" = $1 AND name = $2 LIMIT 1`,
          [row.projectId, name],
        );
        if (conflict.length === 0) break;
        suffix += 1;
        name = `${baseName}-${suffix}`;
      }

      const baseURL = row.providerSettings?.baseURL ?? null;

      const value = {
        type: 'CUSTOM_AUTH',
        props: {
          provider: row.provider ?? null,
          model: row.model ?? null,
          customModel: null,
          apiKey: row.apiKey ?? null,
          baseURL,
          providerSettings: row.providerSettings ?? null,
          modelSettings: row.modelSettings ?? null,
        },
      } as const;

      const encryptedValue = encryptUtils.encryptObject(value);

      await queryRunner.query(
        `
        INSERT INTO "app_connection" (id, created, updated, name, type, status, "projectId", value, "authProviderKey")
        VALUES (
          substr(replace(cast(gen_random_uuid() as text), '-', ''), 1, 21),
          now(), now(),
          $1, $2, $3, $4, $5, $6
        )
        RETURNING id
      `,
        [
          name,
          'CUSTOM_AUTH',
          'ACTIVE',
          row.projectId,
          JSON.stringify(encryptedValue),
          'AI',
        ],
      );

      const connectionTemplate = `{{connections['${name}']}}`;
      await queryRunner.query(
        `UPDATE "ai_config" SET connection = $1 WHERE id = $2`,
        [connectionTemplate, row.id],
      );
    }

    logger.info('MigrateAiConfigToAppConnection1759242268873: completed');
  }

  public async down(): Promise<void> {
    // Irreversible
    throw new Error('Not implemented');
  }
}
