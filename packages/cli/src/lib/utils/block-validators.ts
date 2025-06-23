import chalk from 'chalk';

export const validateBlockName = async (blockName: string) => {
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

export const validatePackageName = async (packageName: string) => {
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

export const checkIfBlockExists = async (blockName: string) => {
  const { findBlockSourceDirectory } = await import('../utils/block-utils');
  const path = await findBlockSourceDirectory(blockName);
  if (path) {
    console.log(chalk.red(`🚨 Block already exists at ${path}`));
    process.exit(1);
  }
};
