/* eslint-disable @typescript-eslint/no-explicit-any */
import { fileCompressor, logger } from '@openops/server-shared';
import { FileCompression, openOpsId } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { encryptUtils } from '../../helper/encryption';

export class AddStepIdToExistingFlowVersionsAndInsertOutputInTestOutputTable1746454781866
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info(
      'AddStepIdToExistingFlowVersionsAndInsertOutputInTestOutputTable1746454781866: starting',
    );

    const workflows = await queryRunner.query(
      'SELECT "id", "trigger" FROM "flow_version"',
    );

    await updateRecords(queryRunner, workflows, 'flow_version');

    logger.info(
      'AddStepIdToExistingFlowVersionsAndInsertOutputInTestOutputTable1746454781866: completed',
    );
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

    const { updatedJson, extractedData } = await processJsonObject(jsonData);

    await queryRunner.query(
      `UPDATE "${tableName}" SET "trigger" = $1 WHERE "id" = $2`,
      [updatedJson, record.id],
    );

    for (const data of extractedData) {
      const encryptOutput = encryptUtils.encryptObject(
        data.currentSelectedData,
      );
      const binaryOutput = Buffer.from(JSON.stringify(encryptOutput));

      const compressedOutput = await fileCompressor.compress({
        data: binaryOutput,
        compression: FileCompression.GZIP,
      });

      const id = openOpsId();
      await queryRunner.query(
        `INSERT INTO flow_step_test_output (
           id,
           "stepId",
           "flowVersionId",
           output
         )
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("stepId", "flowVersionId")
         DO UPDATE SET output = EXCLUDED.output, id = EXCLUDED.id
        `,
        [id, data.stepId, record.id, compressedOutput],
      );
    }
  }
}

async function processJsonObject(obj: any): Promise<{
  updatedJson: any;
  extractedData: Array<{ stepId: string; currentSelectedData: any }>;
}> {
  const extractedData: Array<{ stepId: string; currentSelectedData: any }> = [];

  const updatedJson = await updateJsonObject(obj, extractedData);

  return { updatedJson, extractedData };
}

async function updateJsonObject(
  obj: any,
  extractedData: Array<{ stepId: string; currentSelectedData: any }>,
): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj.name && obj.type && !obj.id) {
    obj.id = openOpsId();
  }

  if (obj.settings?.inputUiInfo?.currentSelectedData !== undefined) {
    const currentSelectedData = obj.settings.inputUiInfo.currentSelectedData;

    extractedData.push({
      stepId: obj.id,
      currentSelectedData,
    });
  }

  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      obj[key] = await Promise.all(
        obj[key].map((item: any) => updateJsonObject(item, extractedData)),
      );
    } else if (typeof obj[key] === 'object') {
      obj[key] = await updateJsonObject(obj[key], extractedData);
    }
  }

  return obj;
}
