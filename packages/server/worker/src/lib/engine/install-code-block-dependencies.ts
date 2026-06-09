import { logger } from '@openops/server-shared';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const BASE_CODE_DIRECTORY =
  process.env['OPS_BASE_CODE_DIRECTORY'] ?? './cache/codes';

export function installCodeBlockDependencies(): void {
  logger.info('Installing code block dependencies...', {
    directory: BASE_CODE_DIRECTORY,
  });

  if (!existsSync(BASE_CODE_DIRECTORY)) {
    mkdirSync(BASE_CODE_DIRECTORY, { recursive: true });
  }

  try {
    execSync(
      'npm init -y && npm i @tsconfig/node20@20.1.4 @types/node@20.14.8 typescript@5.6.3',
      { cwd: BASE_CODE_DIRECTORY },
    );

    logger.info('Code block dependencies installed successfully');
  } catch (error) {
    logger.error('Failed to install code block dependencies', { error });
    throw error;
  }
}
