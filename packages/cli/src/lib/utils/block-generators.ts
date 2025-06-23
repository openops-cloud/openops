import chalk from 'chalk';
import { readdir, unlink, writeFile } from 'fs/promises';
import { exec } from '../utils/exec';
import {
  readJestConfig,
  readPackageEslint,
  readProjectJson,
  writeJestConfig,
  writePackageEslint,
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
    await unlink(path + file);
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
  projectJson.targets.build.options.updateBuildableProjectDepsInPackageJson =
    true;

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

export const updateEslintFile = async (blockName: string) => {
  const eslintFile = await readPackageEslint(`packages/blocks/${blockName}`);
  const ruleIndex = eslintFile.overrides.findIndex(
    (rule: any) => rule.files[0] == '*.json',
  );
  if (ruleIndex !== -1) {
    eslintFile.overrides.splice(ruleIndex, 1);
  }
  await writePackageEslint(`packages/blocks/${blockName}`, eslintFile);
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
