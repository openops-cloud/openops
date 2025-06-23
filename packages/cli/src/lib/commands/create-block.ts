import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  nxGenerateNodeLibrary,
  removeUnusedFiles,
  updateEslintFile,
  updateJestConfigFile,
  updateProjectJsonConfig,
} from '../utils/block-generators';
import {
  generateAuthFile,
  generateIndexTsFile,
  generateOpinionatedStructure,
} from '../utils/block-templates';
import {
  checkIfBlockExists,
  validateBlockName,
  validatePackageName,
} from '../utils/block-validators';

const setupGeneratedLibrary = async (
  blockName: string,
  authType: string,
  createOpinionatedStructure: boolean,
) => {
  await removeUnusedFiles(blockName);
  await generateIndexTsFile(blockName, authType);
  await generateAuthFile(blockName, authType);
  await updateProjectJsonConfig(blockName);
  await updateEslintFile(blockName);
  await updateJestConfigFile(blockName);

  if (createOpinionatedStructure) {
    await generateOpinionatedStructure(blockName, authType);
  }
};

export const createBlock = async (
  blockName: string,
  packageName: string,
  authType: string,
  createOpinionatedStructure: boolean,
) => {
  await validateBlockName(blockName);
  await validatePackageName(packageName);
  await checkIfBlockExists(blockName);
  await nxGenerateNodeLibrary(blockName, packageName);
  await setupGeneratedLibrary(blockName, authType, createOpinionatedStructure);
  console.log(chalk.green('✨  Done!'));
  console.log(
    chalk.yellow(
      `The block has been generated at: packages/blocks/${blockName}`,
    ),
  );

  if (createOpinionatedStructure) {
    console.log(
      chalk.blue(
        `📁 Opinionated folder structure created with sample actions, tests, and service layer`,
      ),
    );
  }
};

export const createBlockCommand = new Command('create')
  .description('Create a new block')
  .action(async () => {
    const questions = [
      {
        type: 'input',
        name: 'blockName',
        message: 'Enter the block name:',
        validate: (input: string) => {
          const blockNamePattern = /^[A-Za-z0-9-]+$/;
          if (!blockNamePattern.test(input)) {
            return 'Block names can only contain lowercase letters, numbers, and hyphens.';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'packageName',
        message: 'Enter the package name:',
        default: (answers: any) => `@openops/block-${answers.blockName}`,
        when: (answers: any) => answers.blockName !== undefined,
        validate: (input: string) => {
          const packageNamePattern = /^(?:@[a-zA-Z0-9-]+\/)?[a-zA-Z0-9-]+$/;
          if (!packageNamePattern.test(input)) {
            return 'Package names can only contain lowercase letters, numbers, and hyphens.';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'authType',
        message: 'Select authentication type:',
        choices: [
          { name: 'None (No authentication)', value: 'none' },
          { name: 'Secret (API Key)', value: 'secret' },
          { name: 'Custom (Custom properties)', value: 'custom' },
          { name: 'OAuth2 (OAuth2 flow)', value: 'oauth2' },
        ],
        default: 'none',
        pageSize: 4,
        loop: false,
      },
      {
        type: 'list',
        name: 'createOpinionatedStructure',
        message:
          'Create opinionated folder structure with stubs for actions, tests, and common service layer?',
        choices: [
          {
            name: 'Yes - Create full folder structure with stubs',
            value: true,
          },
          { name: 'No - Create minimal structure only', value: false },
        ],
        default: true,
        pageSize: 2,
        loop: false,
      },
    ];

    const answers = await inquirer.prompt(questions);
    createBlock(
      answers.blockName,
      answers.packageName,
      answers.authType,
      answers.createOpinionatedStructure,
    );
  });
