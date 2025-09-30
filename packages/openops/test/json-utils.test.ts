import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseJsonFile,
  tryParseJson,
  writeToJsonFile,
} from '../src/lib/json-utils';

describe('Json utils', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'json-utils-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('parseJsonFile', () => {
    it('parses a valid JSON file into an object', async () => {
      const filePath = join(tempDir, 'data.json');
      const data = { name: 'alpha', count: 42, flag: true, list: [1, 2, 3] };
      await writeFile(filePath, JSON.stringify(data), 'utf-8');

      const parsed = await parseJsonFile<typeof data>(filePath);
      expect(parsed).toEqual(data);
    });
  });

  describe('writeToJsonFile', () => {
    it('serializes Map instances to plain objects', async () => {
      const filePath = join(tempDir, 'map.json');
      const payload = {
        id: 'x1',
        map: new Map<string, unknown>([
          ['a', 1],
          ['b', 'two'],
        ]),
        nested: {
          innerMap: new Map<string, number>([
            ['k1', 10],
            ['k2', 20],
          ]),
        },
      };

      await writeToJsonFile(filePath, payload);

      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual({
        id: 'x1',
        map: { a: 1, b: 'two' },
        nested: { innerMap: { k1: 10, k2: 20 } },
      });
    });
  });

  describe('tryParseJson', () => {
    it('returns parsed object for valid JSON strings', () => {
      const input = '{"x":1,"y":"z"}';
      expect(tryParseJson(input)).toEqual({ x: 1, y: 'z' });
    });

    it('returns the original string when parsing fails', () => {
      const input = '{"x":1,}';
      expect(tryParseJson(input)).toBe(input);
    });
  });
});
