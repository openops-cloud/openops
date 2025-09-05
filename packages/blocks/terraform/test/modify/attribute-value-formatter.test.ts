import { escapeAttributeValue } from '../../src/lib/modify/attribute-value-formatter';

describe('escapeAttributeValue', () => {
  test.each([
    ['42', "'42'"],
    [' 42 ', "'42'"],
    ['true', "'true'"],
    ['false', "'false'"],
    [true, "'true'"],
    [false, "'false'"],
    [3.14, "'3.14'"],
    [0, "'0'"],
    [null, "'null'"],
    [' hi ', `'"hi"'`],
    ["a'b", "'\"a'\\''b\"'"],
  ])('primitive and string cases %p', (input: any, expected: string) => {
    const result = escapeAttributeValue(input);
    expect(result).toBe(expected);
  });

  test('array formatting and escaping', () => {
    const value = [1, ' 2 ', false, "x'y"];
    const result = escapeAttributeValue(value);
    const expected = `'[\n1,\n2,\nfalse,\n"x'\\''y"\n]'`;
    expect(result).toBe(expected);
  });

  test('empty array and object', () => {
    expect(escapeAttributeValue([])).toBe("'[]'");
    expect(escapeAttributeValue({})).toBe("'{}'");
  });
});
