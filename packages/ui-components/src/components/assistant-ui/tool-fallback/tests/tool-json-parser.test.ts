import { tryParseJson } from '../../../../lib/json-utils';
import {
  extractJsonFromContent,
  formatToolResultForDisplay,
  isContentStructure,
} from '../tool-json-parser';

describe('json-content-parser', () => {
  describe('isContentStructure', () => {
    it('should return true for valid content structure', () => {
      const validStructure = {
        content: [
          { type: 'text', text: 'Hello world' },
          { type: 'text', text: 'Another text' },
        ],
      };
      expect(isContentStructure(validStructure)).toBe(true);
    });

    it('should return true for empty content array', () => {
      const emptyContent = { content: [] };
      expect(isContentStructure(emptyContent)).toBe(true);
    });

    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
      ['string', 'string'],
      [123, 'number'],
      [[], 'array'],
      [{}, 'empty object'],
      [{ content: 'not array' }, 'content is not array'],
      [{ content: [{ type: 'image' }] }, 'wrong type in content'],
      [{ content: [{ type: 'text' }] }, 'missing text property'],
      [{ content: [{ text: 'hello' }] }, 'missing type property'],
      [{ content: [{ type: 'text', text: 123 }] }, 'text is not string'],
      [{ other: 'property' }, 'missing content property'],
    ])('should return false for %s (%s)', (value: unknown, _: string) => {
      expect(isContentStructure(value)).toBe(false);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON strings', () => {
      const jsonString = '{"key": "value", "number": 42}';
      const expected = { key: 'value', number: 42 };
      expect(tryParseJson(jsonString)).toEqual(expected);
    });

    it('should parse JSON arrays', () => {
      const jsonArray = '[1, 2, 3, "test"]';
      const expected = [1, 2, 3, 'test'];
      expect(tryParseJson(jsonArray)).toEqual(expected);
    });

    it('should return original string for invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      expect(tryParseJson(invalidJson)).toBe(invalidJson);
    });

    it('should return original value for non-string input', () => {
      const nonString = 123;
      expect(tryParseJson(nonString as any)).toBe(nonString);
    });

    it('should handle complex nested JSON', () => {
      const complexJson =
        '{"data": [{"id": "123", "nested": {"value": true}}]}';
      const expected = {
        data: [{ id: '123', nested: { value: true } }],
      };
      expect(tryParseJson(complexJson)).toEqual(expected);
    });
  });

  describe('extractJsonFromContent', () => {
    it('should return empty string for empty content array', () => {
      expect(extractJsonFromContent([])).toBe('');
    });

    it('should parse and format JSON from single text content', () => {
      const content = [
        {
          type: 'text' as const,
          text: '{"data": [{"id": "123", "name": "test"}]}',
        },
      ];
      const result = extractJsonFromContent(content);
      const expected = JSON.stringify(
        { data: [{ id: '123', name: 'test' }] },
        null,
        2,
      );
      expect(result).toBe(expected);
    });

    it('should return original text if JSON parsing fails for single content', () => {
      const content = [{ type: 'text' as const, text: 'Not JSON content' }];
      expect(extractJsonFromContent(content)).toBe('Not JSON content');
    });
  });

  describe('formatResultForDisplay', () => {
    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
    ])('should handle %s values', (value, expected) => {
      expect(formatToolResultForDisplay(value)).toBe(expected);
    });

    it('should handle primitive values', () => {
      expect(formatToolResultForDisplay(42)).toBe('42');
      expect(formatToolResultForDisplay(true)).toBe('true');
      expect(formatToolResultForDisplay('simple string')).toBe('simple string');
    });

    it('should parse and format JSON strings', () => {
      const jsonString = '{"key": "value", "number": 42}';
      const result = formatToolResultForDisplay(jsonString);
      const expected = JSON.stringify({ key: 'value', number: 42 }, null, 2);
      expect(result).toBe(expected);
    });

    it('should return original string if not valid JSON', () => {
      const nonJsonString = 'This is just a regular string';
      expect(formatToolResultForDisplay(nonJsonString)).toBe(nonJsonString);
    });

    it('should handle content structure and extract JSON', () => {
      const contentStructure = {
        content: [
          {
            type: 'text',
            text: '{"data": [{"id": "aK3T27MRliBIxYKfHSxSF", "status": "active"}]}',
          },
        ],
      };
      const result = formatToolResultForDisplay(contentStructure);
      const expected = JSON.stringify(
        {
          data: [{ id: 'aK3T27MRliBIxYKfHSxSF', status: 'active' }],
        },
        null,
        2,
      );
      expect(result).toBe(expected);
    });

    it('should handle content structure with non-JSON text', () => {
      const contentStructure = {
        content: [{ type: 'text', text: 'Simple text content' }],
      };
      expect(formatToolResultForDisplay(contentStructure)).toBe(
        'Simple text content',
      );
    });

    it('should handle regular objects', () => {
      const regularObject = { key: 'value', nested: { data: [1, 2, 3] } };
      const result = formatToolResultForDisplay(regularObject);
      const expected = JSON.stringify(regularObject, null, 2);
      expect(result).toBe(expected);
    });

    it('should handle complex content structure from user example', () => {
      const userExample = {
        content: [
          {
            type: 'text',
            text: '{\n  "data": [\n    {\n      "id": "aK3T27MRliBIxYKfHSxSF",\n      "created": "2025-08-18T16:34:04.527Z",\n      "updated": "2025-08-18T16:34:04.527Z",\n      "projectId": "4VRn94rrNGl4TV0hGk6W4",\n      "status": "active"\n    }\n  ]\n}',
          },
        ],
      };

      const result = formatToolResultForDisplay(userExample);
      const expectedData = {
        data: [
          {
            id: 'aK3T27MRliBIxYKfHSxSF',
            created: '2025-08-18T16:34:04.527Z',
            updated: '2025-08-18T16:34:04.527Z',
            projectId: '4VRn94rrNGl4TV0hGk6W4',
            status: 'active',
          },
        ],
      };
      const expected = JSON.stringify(expectedData, null, 2);
      expect(result).toBe(expected);
    });

    it('should handle objects that cannot be JSON.stringify-ed', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const result = formatToolResultForDisplay(circularObj);
      expect(result).toBe('[object Object]');
    });

    it('should handle arrays as input', () => {
      const arrayInput = [{ id: 1 }, { id: 2 }];
      const result = formatToolResultForDisplay(arrayInput);
      const expected = JSON.stringify(arrayInput, null, 2);
      expect(result).toBe(expected);
    });
  });
});
