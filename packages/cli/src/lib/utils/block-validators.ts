import chalk from 'chalk';

export const validateBlockName = (blockName: string) => {
  console.log(chalk.yellow('Validating block name....'));
  const blockNamePattern = /^[A-Za-z0-9-]+$/;
  if (!blockNamePattern.test(blockName)) {
    return `🚨 Invalid block name: ${blockName}. Block names can only contain lowercase letters, numbers, and hyphens.`;
  }
  return true;
};

export const validatePackageName = (packageName: string) => {
  console.log(chalk.yellow('Validating package name....'));
  const packageNamePattern = /^(?:@[a-zA-Z0-9-]+\/)?[a-zA-Z0-9-]+$/;
  if (!packageNamePattern.test(packageName)) {
    return `🚨 Invalid package name: ${packageName}. Package names can only contain lowercase letters, numbers, and hyphens.`;
  }
  return true;
};

export const checkIfBlockExists = async (blockName: string) => {
  const { findBlockSourceDirectory } = await import('../utils/block-utils');
  const path = await findBlockSourceDirectory(blockName);
  if (path) {
    console.log(chalk.red(`🚨 Block already exists at ${path}`));
    process.exit(1);
  }
};
