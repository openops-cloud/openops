import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePieceToBlockMigration1741475952000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('RenamePieceToBlockMigration1741475952000: starting');

    await this.migrateFlowVersion(queryRunner);
    await this.migrateFlowTemplate(queryRunner);
    await this.migrateAppConnection(queryRunner);
    await this.migrateTriggerEvents(queryRunner);

    logger.info('RenamePieceToBlockMigration1741475952000: up finished');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.info('RenamePieceToBlockMigration1741475952000: down finished');
  }

  private async migrateFlowVersion(queryRunner: QueryRunner) {
    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateFlowVersion starting',
    );

    const records = await queryRunner.query(`
      SELECT "id", "trigger"
      FROM "flow_version"
  `);

    for (const record of records) {
      let jsonData = record.trigger;

      jsonData = this.addBlockToFlowJson(jsonData, true);

      await queryRunner.query(
        'UPDATE "flow_version" SET "trigger" = $1 WHERE "id" = $2',
        [jsonData, record.id],
      );
    }

    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateFlowVersion finished',
    );
  }

  private async migrateFlowTemplate(queryRunner: QueryRunner) {
    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateFlowTemplate starting',
    );

    await queryRunner.query(`
      ALTER TABLE "flow_template"
      ADD "blocks" jsonb NULL
  `);

    const records = await queryRunner.query(`
      SELECT "id", "template", "pieces"
      FROM "flow_template";
  `);

    for (const record of records) {
      let jsonData = record.template;

      jsonData = this.addBlockToFlowJson(jsonData, false);

      const blocks = (record.pieces as string[]).map((x) =>
        x.replace('@openops/piece-', '@openops/block-'),
      );

      await queryRunner.query(
        'UPDATE "flow_template" SET "blocks" = $1::jsonb, "template" = $2 WHERE "id" = $3;',
        [JSON.stringify(blocks), jsonData, record.id],
      );
    }

    await queryRunner.query(`
      ALTER TABLE "flow_template"
      ALTER COLUMN "blocks" SET NOT NULL,
      ALTER COLUMN "pieces" DROP NOT NULL;
  `);

    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateFlowTemplate finished',
    );
  }

  private async migrateAppConnection(queryRunner: QueryRunner) {
    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateAppConnection starting',
    );

    await queryRunner.query(`
      ALTER TABLE "app_connection"
      ADD "blockName" character varying NULL
  `);

    await queryRunner.query(`
      UPDATE "app_connection"
      SET "blockName" = REPLACE("pieceName", '@openops/piece-', '@openops/block-');
  `);

    await queryRunner.query(`
      ALTER TABLE "app_connection"
      ALTER COLUMN "blockName" SET NOT NULL,
      ALTER COLUMN "pieceName" DROP NOT NULL;
`);

    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateAppConnection finished',
    );
  }

  private async migrateTriggerEvents(queryRunner: QueryRunner) {
    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateTriggerEvents starting',
    );

    await queryRunner.query(`
      UPDATE "trigger_event"
      SET "sourceName" = REPLACE("sourceName", '@openops/piece-', '@openops/block-');
  `);

    logger.info(
      'RenamePieceToBlockMigration1741475952000: migrateTriggerEvents finished',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addBlockToFlowJson(obj: any, replaceType: boolean): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    obj.blockVersion = obj.pieceVersion;
    obj.blockType = obj.pieceType;
    obj.blockName = obj.pieceName?.replace(
      '@openops/piece-',
      '@openops/block-',
    );

    if (replaceType) {
      if (obj.type == 'PIECE_TRIGGER' || obj.type == 'BLOCK_TRIGGER') {
        obj.type = 'TRIGGER';
      }
      if (obj.type == 'PIECE') {
        obj.type = 'BLOCK';
      }
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'object') {
          if (Array.isArray(obj[key])) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            obj[key] = obj[key].map((item: any) =>
              this.addBlockToFlowJson(item, replaceType),
            );
          } else {
            obj[key] = this.addBlockToFlowJson(obj[key], replaceType);
          }
        }
      }
    }

    return obj;
  }
}
