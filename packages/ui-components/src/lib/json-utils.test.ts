import { tryParseJson } from './json-utils';

describe('tryParseJson', () => {
  it('should return the original value if it is not a string', () => {
    const testValue = { name: 'test', value: 123 };
    expect(tryParseJson(testValue)).toBe(testValue);
  });

  it('should parse valid JSON strings', () => {
    const jsonString = '{"name": "test", "value": 123}';
    const expected = { name: 'test', value: 123 };
    expect(tryParseJson(jsonString)).toEqual(expected);
  });

  it('should return the original string if JSON parsing fails', () => {
    const invalidJson = '{"name": "test", "value": 123,}'; // trailing comma
    expect(tryParseJson(invalidJson)).toBe(invalidJson);
  });

  it('should handle empty strings', () => {
    expect(tryParseJson('')).toBe('');
  });

  it('should handle null and undefined', () => {
    expect(tryParseJson(null)).toBe(null);
    expect(tryParseJson(undefined)).toBe(undefined);
  });
});
