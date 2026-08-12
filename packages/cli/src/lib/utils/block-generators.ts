import chalk from 'chalk';
import { readdir, unlink } from 'fs/promises';
import { rm, stat } from 'node:fs/promises';
import nodePath from 'node:path';
import { exec } from '../utils/exec';
import {
  readJestConfig,
  readProjectJson,
  writeJestConfig,
  writeProjectJson,
} from '../utils/files';

export const nxGenerateNodeLibrary = async (
  blockName: string,
  packageName: string,
) => {
  const nxGenerateCommand = [
    `npx nx generate @nx/node:library`,
    `--directory=packages/blocks/${blockName}`,
    `--name=blocks-${blockName}`,
    `--importPath=${packageName}`,
    '--buildable',
    '--projectNameAndRootFormat=as-provided',
    '--strict',
    '--unitTestRunner=jest',
  ].join(' ');

  console.log(chalk.blue(`🛠️ Executing nx command: ${nxGenerateCommand}`));

  await exec(nxGenerateCommand);
};

export const removeUnusedFiles = async (blockName: string) => {
  const path = `packages/blocks/${blockName}/src/lib/`;
  const files = await readdir(path);
  for (const file of files) {
    const fullPath = nodePath.join(path, file);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      await rm(fullPath, { recursive: true, force: true });
    } else {
      await unlink(fullPath);
    }
  }
};

export const updateProjectJsonConfig = async (blockName: string) => {
  const projectJson = await readProjectJson(`packages/blocks/${blockName}`);

  if (!projectJson.targets?.build?.options) {
    throw new Error(
      '[updateProjectJsonConfig] targets.build.options is required',
    );
  }

  projectJson.targets.build.options.buildableProjectDepsInPackageJsonType =
    'dependencies';
  projectJson.targets.build.options.updateBuildableProjectDepsInPackageJson = true;

  const lintFilePatterns = projectJson.targets.lint?.options?.lintFilePatterns;

  if (lintFilePatterns) {
    const patternIndex = lintFilePatterns.findIndex((item) =>
      item.endsWith('package.json'),
    );
    if (patternIndex !== -1) lintFilePatterns?.splice(patternIndex, 1);
  } else {
    projectJson.targets.lint = {
      executor: '@nx/eslint:lint',
      outputs: ['{options.outputFile}'],
    };
  }

  await writeProjectJson(`packages/blocks/${blockName}`, projectJson);
};

export const removeGeneratedEslintConfig = async (blockName: string) => {
  // Blocks inherit the workspace flat config, so whatever ESLint config the Nx
  // generator emitted is redundant. Every filename it might produce is removed,
  // since its output depends on the config style it detects.
  const path = `packages/blocks/${blockName}`;
  for (const file of [
    'eslint.config.mjs',
    'eslint.config.js',
    '.eslintrc.json',
  ]) {
    await rm(nodePath.join(path, file), { force: true });
  }
};

export const updateJestConfigFile = async (blockName: string) => {
  const jestConfigBuffer = await readJestConfig(`packages/blocks/${blockName}`);
  const jestConfig = jestConfigBuffer.toString();
  const updatedJestConfig = jestConfig.replace(
    /preset:\s*['"].*jest\.preset\.js['"],?/,
    (match) => `${match}\n  setupFiles: ['../../../jest.env.js'],`,
  );

  await writeJestConfig(`packages/blocks/${blockName}`, updatedJestConfig);
};
