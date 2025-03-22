import { getItemsAsArray } from '../src/lib/utils';

describe('getItemsAsArray', () => {
  test.each([
    { input: [] },
    { input: '[]' },
    { input: '' },
    { input: {} },
    { input: null },
    { input: undefined },
  ])('should return empty array when given empty input %p', (testCase) => {
    expect(getItemsAsArray(testCase.input)).toEqual([]);
  });

  test.each([
    { input: [1], output: [1] },
    { input: [true], output: [true] },
    { input: ['blah'], output: ['blah'] },
    { input: [{ a: 1 }], output: [{ a: 1 }] },

    { input: '[1]', output: [1] },
    { input: '[true]', output: [true] },
    { input: '["blah"]', output: ['blah'] },
    { input: '[{"a":1}]', output: [{ a: 1 }] },
  ])('should return parsed array when given valid input %p', (testCase) => {
    expect(getItemsAsArray(testCase.input)).toEqual(testCase.output);
  });

  test('should throw error when given invalid JSON string %p', () => {
    expect(() => getItemsAsArray('     ')).toThrow(
      "Invalid JSON string provided for 'Items'",
    );
  });

  test('should throw error when given a valid JSON string that is not an array %p', () => {
    expect(() => getItemsAsArray('{"a":1}')).toThrow(`'Items' is not an array`);
  });

  test('should throw error when given an object %p', () => {
    expect(() => getItemsAsArray({ a: 1 })).toThrow(`'Items' is not an array`);
  });
});
