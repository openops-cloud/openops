import chalk from 'chalk';
import { Command } from 'commander';
import { readdir, unlink, writeFile } from 'fs/promises';
import inquirer from 'inquirer';
import assert from 'node:assert';
import { findBlockSourceDirectory } from '../utils/block-utils';
import { exec } from '../utils/exec';
import {
  readJestConfig,
  readPackageEslint,
  readProjectJson,
  writeJestConfig,
  writePackageEslint,
  writeProjectJson,
} from '../utils/files';

const validateBlockName = async (blockName: string) => {
  console.log(chalk.yellow('Validating block name....'));
  const blockNamePattern = /^[A-Za-z0-9-]+$/;
  if (!blockNamePattern.test(blockName)) {
    console.log(
      chalk.red(
        `🚨 Invalid block name: ${blockName}. Block names can only contain lowercase letters, numbers, and hyphens.`,
      ),
    );
    process.exit(1);
  }
};

const validatePackageName = async (packageName: string) => {
  console.log(chalk.yellow('Validating package name....'));
  const packageNamePattern = /^(?:@[a-zA-Z0-9-]+\/)?[a-zA-Z0-9-]+$/;
  if (!packageNamePattern.test(packageName)) {
    console.log(
      chalk.red(
        `🚨 Invalid package name: ${packageName}. Package names can only contain lowercase letters, numbers, and hyphens.`,
      ),
    );
    process.exit(1);
  }
};

const checkIfBlockExists = async (blockName: string) => {
  const path = await findBlockSourceDirectory(blockName);
  if (path) {
    console.log(chalk.red(`🚨 Block already exists at ${path}`));
    process.exit(1);
  }
};

const nxGenerateNodeLibrary = async (
  blockName: string,
  packageName: string,
) => {
  const nxGenerateCommand = [
    `npx nx generate @nx/node:library`,
    `--directory=packages/blocks/${blockName}`,
    `--name=blocks-${blockName}`,
    `--importPath=${packageName}`,
    '--publishable',
    '--buildable',
    '--projectNameAndRootFormat=as-provided',
    '--strict',
    '--unitTestRunner=jest',
  ].join(' ');

  console.log(chalk.blue(`🛠️ Executing nx command: ${nxGenerateCommand}`));

  await exec(nxGenerateCommand);
};

const removeUnusedFiles = async (blockName: string) => {
  const path = `packages/blocks/${blockName}/src/lib/`;
  const files = await readdir(path);
  for (const file of files) {
    await unlink(path + file);
  }
};
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
const generateIndexTsFile = async (blockName: string) => {
  const blockNameCamelCase = blockName
    .split('-')
    .map((s, i) => {
      if (i === 0) {
        return s;
      }

      return s[0].toUpperCase() + s.substring(1);
    })
    .join('');

  const indexTemplate = `
    import { createBlock, BlockAuth } from "@openops/blocks-framework";
    export const ${blockNameCamelCase} = createBlock({
      displayName: "${capitalizeFirstLetter(blockName)}",
      auth: BlockAuth.None(),
      minimumSupportedRelease: '0.20.0',
      logoUrl: "https://static.openops.com/blocks/${blockName}.png",
      authors: [],
      actions: [],
      triggers: [],
    });
    `;

  await writeFile(`packages/blocks/${blockName}/src/index.ts`, indexTemplate);
};
const updateProjectJsonConfig = async (blockName: string) => {
  const projectJson = await readProjectJson(`packages/blocks/${blockName}`);

  assert(
    projectJson.targets?.build?.options,
    '[updateProjectJsonConfig] targets.build.options is required',
  );

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
const updateEslintFile = async (blockName: string) => {
  const eslintFile = await readPackageEslint(`packages/blocks/${blockName}`);
  eslintFile.overrides.splice(
    eslintFile.overrides.findIndex((rule: any) => rule.files[0] == '*.json'),
    1,
  );
  await writePackageEslint(`packages/blocks/${blockName}`, eslintFile);
};

const updateJestConfigFile = async (blockName: string) => {
  let jestConfig = await readJestConfig(`packages/blocks/${blockName}`);

  jestConfig = jestConfig.replace(
    /preset:\s'..\/..\/..\/jest.preset.js',/,
    (match) => `${match}\n  setupFiles: ['../../../jest.env.js'],`,
  );

  await writeJestConfig(`packages/blocks/${blockName}`, jestConfig);
};

const setupGeneratedLibrary = async (blockName: string) => {
  await removeUnusedFiles(blockName);
  await generateIndexTsFile(blockName);
  await updateProjectJsonConfig(blockName);
  await updateEslintFile(blockName);
  await updateJestConfigFile(blockName);
};

export const createBlock = async (blockName: string, packageName: string) => {
  await validateBlockName(blockName);
  await validatePackageName(packageName);
  await checkIfBlockExists(blockName);
  await nxGenerateNodeLibrary(blockName, packageName);
  await setupGeneratedLibrary(blockName);
  console.log(chalk.green('✨  Done!'));
  console.log(
    chalk.yellow(
      `The block has been generated at: packages/blocks/${blockName}`,
    ),
  );
};

export const createBlockCommand = new Command('create')
  .description('Create a new block')
  .action(async () => {
    const questions = [
      {
        type: 'input',
        name: 'blockName',
        message: 'Enter the block name:',
      },
      {
        type: 'input',
        name: 'packageName',
        message: 'Enter the package name:',
        default: (answers: any) => `@openops/block-${answers.blockName}`,
        when: (answers: any) => answers.blockName !== undefined,
      },
    ];

    const answers = await inquirer.prompt(questions);
    createBlock(answers.blockName, answers.packageName);
  });
