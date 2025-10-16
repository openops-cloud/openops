import { readdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { cwd } from 'node:process';

export async function findAllBlocks(path?: string): Promise<string[]> {
  const blocksPath = path ?? resolve(cwd(), 'packages', 'blocks');
  const paths = await traverseFolder(blocksPath);
  return paths;
}
export async function findBlockSourceDirectory(
  blockName: string,
): Promise<string | null> {
  const blocksPath = await findAllBlocks();
  const blockPath = blocksPath.find((path) => {
    const folderName = basename(path);
    return folderName === blockName;
  });
  return blockPath ?? null;
}

async function traverseFolder(folderPath: string): Promise<string[]> {
  const paths: string[] = [];
  const directoryExists = await stat(folderPath).catch(() => null);

  if (directoryExists && directoryExists.isDirectory()) {
    const files = await readdir(folderPath);

    for (const file of files) {
      const filePath = join(folderPath, file);
      const fileStats = await stat(filePath);
      if (
        fileStats.isDirectory() &&
        file !== 'node_modules' &&
        file !== 'dist'
      ) {
        paths.push(...(await traverseFolder(filePath)));
      } else if (file === 'package.json') {
        paths.push(folderPath);
      }
    }
  }
  return paths;
}

export function displayNameToKebabCase(displayName: string): string {
  return displayName.toLowerCase().replace(/\s+/g, '-');
}

export function displayNameToCamelCase(input: string): string {
  const words = input.split(' ');
  const camelCaseWords = words.map((word, index) => {
    if (index === 0) {
      return word.toLowerCase();
    } else {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  });
  return camelCaseWords.join('');
}
