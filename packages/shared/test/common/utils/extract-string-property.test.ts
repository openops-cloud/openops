import { extractPropertyString } from '../../../src/lib/common/utils/extract-string-property';

describe('extractPropertyString', () => {
  type Case = {
    name: string;
    obj: () => unknown;
    keys: readonly string[];
    expected: string | null;
  };

  const cases: Case[] = [
    {
      name: 'returns null when keys are empty',
      obj: () => ({ a: 'x' }),
      keys: [],
      expected: null,
    },
    {
      name: 'returns trimmed string from matching top-level property',
      obj: () => ({ Name: '  hello  ' }),
      keys: ['name'],
      expected: 'hello',
    },
    {
      name: 'returns string from nested object',
      obj: () => ({ a: { b: { message: 'hi' } } }),
      keys: ['message'],
      expected: 'hi',
    },
    {
      name: 'returns string from arrays',
      obj: () => [{ x: 1 }, { Message: 'hey' }],
      keys: ['message'],
      expected: 'hey',
    },
    {
      name: 'is case-insensitive for keys',
      obj: () => ({ TITLE: 'Hello' }),
      keys: ['title'],
      expected: 'Hello',
    },
    {
      name: 'ignores empty or whitespace-only strings',
      obj: () => ({ message: '   ' }),
      keys: ['message'],
      expected: null,
    },
    {
      name: 'falls back to top-level string when no property found',
      obj: () => '  hi there  ',
      keys: ['missing'],
      expected: 'hi there',
    },
    {
      name: 'returns first match in traversal order',
      obj: () => ({ a: { message: 'first' }, b: { message: 'second' } }),
      keys: ['message'],
      expected: 'first',
    },
    {
      name: 'handles cyclic references',
      obj: () => {
        const a: any = {};
        a.self = a;
        a.other = { message: 'ok' };
        return a;
      },
      keys: ['message'],
      expected: 'ok',
    },
    {
      name: 'returns null for non-object non-string inputs without matches',
      obj: () => 42 as unknown as object,
      keys: ['message'],
      expected: null,
    },
    {
      name: 'does not exceed max depth and returns null when match is too deep',
      obj: (): unknown => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {};
        let cursor = obj;
        for (let i = 0; i < 60; i++) {
          cursor.next = {};
          cursor = cursor.next;
        }
        cursor.message = 'too deep';
        return obj;
      },
      keys: ['message'],
      expected: null,
    },
  ];

  test.each(cases)('$name', ({ obj, keys, expected }) => {
    expect(extractPropertyString(obj() as object, keys)).toBe(expected);
  });
});
