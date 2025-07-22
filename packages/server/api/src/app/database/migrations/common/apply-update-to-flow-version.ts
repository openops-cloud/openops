/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryRunner } from 'typeorm';

export async function applyUpdateToFlowVersion(
  queryRunner: QueryRunner,
  updateToPerform: (obj: any) => void,
): Promise<void> {
  const records = await queryRunner.query(
    'SELECT "id", "trigger" FROM "flow_version"',
  );

  for (const record of records) {
    const jsonData = record.trigger;

    const updatedJson = await updateJsonObject(jsonData, updateToPerform);

    await queryRunner.query(
      `UPDATE "flow_version" SET "trigger" = $1 WHERE "id" = $2`,
      [updatedJson, record.id],
    );
  }
}

async function updateJsonObject(
  obj: any,
  updateToPerform: (obj: any) => void,
): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  updateToPerform(obj);

  for (const key of Object.keys(obj)) {
    if (Array.isArray(obj[key])) {
      obj[key] = await Promise.all(
        obj[key].map((item: any) => updateJsonObject(item, updateToPerform)),
      );
    } else if (typeof obj[key] === 'object') {
      obj[key] = await updateJsonObject(obj[key], updateToPerform);
    }
  }

  return obj;
}
