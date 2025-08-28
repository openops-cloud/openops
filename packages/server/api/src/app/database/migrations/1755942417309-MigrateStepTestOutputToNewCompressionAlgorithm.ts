import {
  compressAndEncrypt,
  encryptUtils,
  fileCompressor,
  logger,
} from '@openops/server-shared';
import { FileCompression } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateStepTestOutputToNewCompressionAlgorithm1755942417309
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info(
      'MigrateStepTestOutputToNewCompressionAlgorithm1755942417309: starting',
    );

    const stepTestOutput = await queryRunner.query(
      'SELECT "id", "input", "output" FROM "flow_step_test_output"',
    );

    await updateRecords(queryRunner, stepTestOutput, 'flow_step_test_output');

    await queryRunner.query(`
      ALTER TABLE "flow_step_test_output"
        ALTER COLUMN "input" DROP DEFAULT,
        ALTER COLUMN "output" DROP DEFAULT,

        ALTER COLUMN "input" TYPE jsonb
          USING CASE
                  WHEN "input" IS NULL OR "input"  = ''::bytea THEN '{}'::jsonb
                  ELSE convert_from("input",'UTF8')::jsonb
                END,
        ALTER COLUMN "output" TYPE jsonb
          USING CASE
                  WHEN "output" IS NULL OR "output" = ''::bytea THEN '{}'::jsonb
                  ELSE convert_from("output",'UTF8')::jsonb
                END,

        ALTER COLUMN "input"  SET DEFAULT '{}'::jsonb,
        ALTER COLUMN "output" SET DEFAULT '{}'::jsonb;
    `);

    logger.info(
      'MigrateStepTestOutputToNewCompressionAlgorithm1755942417309: completed',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

async function updateRecords(
  queryRunner: QueryRunner,
  records: { id: string; input: Buffer; output: Buffer }[],
  tableName: string,
): Promise<void> {
  for (const record of records) {
    const inputBuffer = record.input;
    let originalInput: unknown = Buffer.alloc(0);
    if (inputBuffer.length !== 0) {
      originalInput = await decompressAndDecrypt(inputBuffer);
    }

    const outputBuffer = record.output;
    let originalOutput: unknown = Buffer.alloc(0);
    if (outputBuffer.length !== 0) {
      originalOutput = await decompressAndDecrypt(outputBuffer);
    }

    const newInputFormat = await compressAndEncrypt(originalInput);
    const newOutputFormat = await compressAndEncrypt(originalOutput);

    await queryRunner.query(
      `UPDATE "${tableName}" SET "input" = $1, "output" = $2 WHERE "id" = $3;`,
      [
        Buffer.from(JSON.stringify(newInputFormat), 'utf8'),
        Buffer.from(JSON.stringify(newOutputFormat), 'utf8'),
        record.id,
      ],
    );
  }
}

async function decompressAndDecrypt(buffer: Buffer): Promise<unknown> {
  const decompressed = await fileCompressor.decompress({
    data: buffer,
    compression: FileCompression.GZIP,
  });

  const parsedEncryptedObject = JSON.parse(decompressed.toString());
  return encryptUtils.decryptObject(parsedEncryptedObject);
}
