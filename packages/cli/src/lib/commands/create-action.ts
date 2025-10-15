import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  displayNameToCamelCase,
  displayNameToKebabCase,
  findBlockSourceDirectory,
} from '../utils/block-utils';
import { checkIfFileExists, makeFolderRecursive } from '../utils/files';

function createActionTemplate(
  displayName: string,
  description: string,
  isWriteAction: boolean,
) {
  const camelCase = displayNameToCamelCase(displayName);
  const actionTemplate = `import { createAction, Property } from '@openops/blocks-framework';

export const ${camelCase} = createAction({
  name: '${camelCase}',
  displayName: '${displayName}',
  description: '${description}',
  props: {},
  isWriteAction: ${isWriteAction},
  async run() {
    // Action logic here
  },
});
`;

  return actionTemplate;
}
const checkIfBlockExists = async (blockName: string) => {
  const path = await findBlockSourceDirectory(blockName);
  if (!path) {
    console.log(chalk.red(`🚨 Block ${blockName} not found`));
    process.exit(1);
  }
};

const checkIfActionExists = async (actionPath: string) => {
  if (await checkIfFileExists(actionPath)) {
    console.log(chalk.red(`🚨 Action already exists at ${actionPath}`));
    process.exit(1);
  }
};
const createAction = async (
  blockName: string,
  displayActionName: string,
  actionDescription: string,
  isWriteAction: boolean,
) => {
  const actionTemplate = createActionTemplate(
    displayActionName,
    actionDescription,
    isWriteAction,
  );
  const actionName = displayNameToKebabCase(displayActionName);
  const path = await findBlockSourceDirectory(blockName);
  await checkIfBlockExists(blockName);
  console.log(chalk.blue(`Block path: ${path}`));

  const actionsFolder = join(path, 'src', 'lib', 'actions');
  const actionPath = join(actionsFolder, `${actionName}.ts`);
  await checkIfActionExists(actionPath);

  await makeFolderRecursive(actionsFolder);
  await writeFile(actionPath, actionTemplate);
  console.log(chalk.yellow('✨'), `Action ${actionPath} created`);
};

export const createActionCommand = new Command('create')
  .description('Create a new action')
  .action(async () => {
    const questions = [
      {
        type: 'input',
        name: 'blockName',
        message: 'Enter the block folder name:',
        placeholder: 'google-drive',
      },
      {
        type: 'input',
        name: 'actionName',
        message: 'Enter the action display name',
      },
      {
        type: 'input',
        name: 'actionDescription',
        message: 'Enter the action description',
      },
      {
        type: 'confirm',
        name: 'isWriteAction',
        message:
          'Does this action modify data or state (e.g., create, update, delete)?',
      },
    ];

    const answers = await inquirer.prompt(questions);
    createAction(
      answers.blockName,
      answers.actionName,
      answers.actionDescription,
      answers.isWriteAction,
    );
  });
