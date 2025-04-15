import { Command } from 'commander';
import { createActionCommand } from './lib/commands/create-action';
import { createBlockCommand } from './lib/commands/create-block';
import { createTriggerCommand } from './lib/commands/create-trigger';
import { syncBlockCommand } from './lib/commands/sync-blocks';

const blockCommand = new Command('blocks').description('Manage blocks');

blockCommand.addCommand(createBlockCommand);
blockCommand.addCommand(syncBlockCommand);

const actionCommand = new Command('actions').description('Manage actions');

actionCommand.addCommand(createActionCommand);

const triggerCommand = new Command('triggers').description('Manage triggers');

triggerCommand.addCommand(createTriggerCommand);

const program = new Command();

program.version('0.0.1').description('OpenOps CLI');

program.addCommand(blockCommand);
program.addCommand(actionCommand);
program.addCommand(triggerCommand);

program.parse(process.argv);
