/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '@openops/server-shared';
import { openOpsId } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStepIdToExistingFlowVersions1749644220381
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddStepIdToExistingFlowVersions1749644220381: starting');

    const workflows = await queryRunner.query(
      'SELECT "id", "trigger" FROM "flow_version"',
    );

    await updateRecords(queryRunner, workflows, 'flow_version');

    logger.info('AddStepIdToExistingFlowVersions1749644220381: completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function updateRecords(
  queryRunner: QueryRunner,
  records: { id: string; trigger: any }[],
  tableName: string,
): Promise<void> {
  for (const record of records) {
    const jsonData = record.trigger;

    const updatedJson = await updateJsonObject(jsonData);

    await queryRunner.query(
      `UPDATE "${tableName}" SET "trigger" = $1 WHERE "id" = $2`,
      [updatedJson, record.id],
    );
  }
}

async function updateJsonObject(obj: any): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj.name && obj.type && !obj.id) {
    obj.id = openOpsId();
  }

  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      obj[key] = await Promise.all(
        obj[key].map((item: any) => updateJsonObject(item)),
      );
    } else if (typeof obj[key] === 'object') {
      obj[key] = await updateJsonObject(obj[key]);
    }
  }

  return obj;
}
