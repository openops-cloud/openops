import axios, { AxiosError } from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import FormData from 'form-data';
import fs from 'fs';
import path, { join } from 'path';
import { findAllBlocks } from '../utils/block-utils';
import { exec } from '../utils/exec';
import { readPackageJson, readProjectJson } from '../utils/files';

async function syncBlocks(apiUrl: string, apiKey: string) {
  const blocksFolder = await findAllBlocks(
    join(process.cwd(), 'packages', 'blocks', 'custom'),
  );
  for (const blockFolder of blocksFolder) {
    const projectJson = await readProjectJson(blockFolder);
    const packageJson = await readPackageJson(blockFolder);

    await exec('npx nx build ' + projectJson.name);

    const compiledPath = path.resolve(
      'dist/packages' + blockFolder.split('/packages')[1],
    );
    const { stdout } = await exec('cd ' + compiledPath + ' && npm pack --json');
    const tarFileName = JSON.parse(stdout)[0].filename;
    const formData = new FormData();
    console.log('Uploading ' + tarFileName);
    formData.append(
      'blockArchive',
      fs.createReadStream(join(compiledPath, tarFileName)),
    );
    formData.append('blockName', packageJson.name);
    formData.append('blockVersion', packageJson.version);
    formData.append('packageType', 'ARCHIVE');
    formData.append('scope', 'PLATFORM');

    try {
      await axios.post(`${apiUrl}/v1/blocks`, formData, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
      });
      console.info(chalk.green(`Block '${packageJson.name}' published.`));
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        if (axiosError.response.status === 409) {
          console.info(
            chalk.yellow(
              `Block '${packageJson.name}' and '${packageJson.version}' already published.`,
            ),
          );
        } else if (Math.floor(axiosError.response.status / 100) !== 2) {
          console.info(
            chalk.red(
              `Error publishing block '${packageJson.name}', ` +
                JSON.stringify(axiosError.response.data),
            ),
          );
        } else {
          console.error(chalk.red(`Unexpected error: ${error.message}`));
        }
      } else {
        console.error(chalk.red(`Unexpected error: ${error.message}`));
      }
    }
  }
}

export const syncBlockCommand = new Command('sync')
  .description('Find new blocks versions and sync them with the database')
  .requiredOption(
    '-h, --apiUrl <url>',
    'API URL ex: https://app.openops.com/api',
  )
  .action(async (options) => {
    const apiKey = process.env.OPS_API_KEY;
    const apiUrlWithoutTrailSlash = options.apiUrl.replace(/\/$/, '');
    if (!apiKey) {
      console.error(chalk.red('OPS_API_KEY environment variable is required'));
      process.exit(1);
    }
    await syncBlocks(apiUrlWithoutTrailSlash, apiKey);
  });
