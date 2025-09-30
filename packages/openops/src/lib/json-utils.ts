import { readFile, writeFile } from 'node:fs/promises';

export async function parseJsonFile<T>(filePath: string): Promise<T> {
  const file = await readFile(filePath, 'utf-8');
  return JSON.parse(file);
}

export async function writeToJsonFile(
  filePath: string,
  obj: unknown,
): Promise<void> {
  const serializedObj = JSON.stringify(obj, (_key: string, value: unknown) => {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    } else {
      return value;
    }
  });

  await writeFile(filePath, serializedObj, 'utf-8');
}

export function tryParseJson(value: any): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error_) {
    return value;
  }
}
