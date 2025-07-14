import { logger } from '@openops/server-shared';
import { randomBytes } from 'crypto';
import * as fs from 'node:fs/promises';

export async function useTempFile<T>(
  fileContent: string,
  callback: (filePath: string) => Promise<T>,
): Promise<T> {
  const tempFileName = `/tmp/${randomBytes(12).toString('hex')}`;

  let result: T;

  try {
    await fs.writeFile(tempFileName, fileContent);

    result = await callback(tempFileName);
  } finally {
    try {
      await fs.unlink(tempFileName);
    } catch (unlinkError) {
      logger.error('Error occurred while removing temporary file', {
        error: unlinkError,
      });
    }
  }

  return result;
}
