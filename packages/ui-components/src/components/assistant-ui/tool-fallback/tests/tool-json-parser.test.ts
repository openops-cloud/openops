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

  describe('extractJsonFromContent', () => {
    it('should return empty string for empty content array', () => {
      expect(extractJsonFromContent([])).toBe('');
    });

    it('should parse and return JSON object from single text content', () => {
      const content = [
        {
          type: 'text' as const,
          text: '{"data": [{"id": "123", "name": "test"}]}',
        },
      ];
      const result = extractJsonFromContent(content);
      const expected = { data: [{ id: '123', name: 'test' }] };
      expect(result).toEqual(expected);
    });

    it('should return original text if JSON parsing fails for single content', () => {
      const content = [{ type: 'text' as const, text: 'Not JSON content' }];
      expect(extractJsonFromContent(content)).toBe('Not JSON content');
    });

    // Fail-safe tests
    it('should handle null/undefined content arrays', () => {
      expect(extractJsonFromContent(null as any)).toBe('');
      expect(extractJsonFromContent(undefined as any)).toBe('');
    });

    it('should handle non-array content', () => {
      expect(extractJsonFromContent('not an array' as any)).toBe('');
      expect(extractJsonFromContent(123 as any)).toBe('');
      expect(extractJsonFromContent({} as any)).toBe('');
    });

    it('should handle content with invalid structure', () => {
      const invalidContent = [
        { type: 'image', url: 'test.jpg' }, // wrong type
      ] as any;
      expect(extractJsonFromContent(invalidContent)).toEqual(invalidContent);
    });

    it('should handle content with missing text property', () => {
      const invalidContent = [
        { type: 'text' }, // missing text property
      ] as any;
      expect(extractJsonFromContent(invalidContent)).toEqual(invalidContent);
    });

    it('should handle content with non-string text property', () => {
      const invalidContent = [
        { type: 'text', text: 123 }, // text is not a string
      ] as any;
      expect(extractJsonFromContent(invalidContent)).toEqual(invalidContent);
    });

    it('should handle multiple content items and return them as-is', () => {
      const multipleContent = [
        { type: 'text' as const, text: 'First text' },
        { type: 'text' as const, text: 'Second text' },
      ];
      expect(extractJsonFromContent(multipleContent)).toEqual(multipleContent);
    });
  });

  describe('formatToolResultForDisplay', () => {
    it.each([
      [null, 'null'],
      [undefined, 'undefined'],
    ])('should handle %s values', (value, expected) => {
      expect(formatToolResultForDisplay(value)).toBe(expected);
    });

    it('should handle primitive values', () => {
      expect(formatToolResultForDisplay(42)).toBe(42);
      expect(formatToolResultForDisplay(true)).toBe(true);
      expect(formatToolResultForDisplay('simple string')).toBe('simple string');
    });

    it('should parse and return JSON objects from strings', () => {
      const jsonString = '{"key": "value", "number": 42}';
      const result = formatToolResultForDisplay(jsonString);
      const expected = { key: 'value', number: 42 };
      expect(result).toEqual(expected);
    });

    it('should return original string if not valid JSON', () => {
      const nonJsonString = 'This is just a regular string';
      expect(formatToolResultForDisplay(nonJsonString)).toBe(nonJsonString);
    });

    it('should handle content structure and extract JSON objects', () => {
      const contentStructure = {
        content: [
          {
            type: 'text',
            text: '{"data": [{"id": "aK3T27MRliBIxYKfHSxSF", "status": "active"}]}',
          },
        ],
      };
      const result = formatToolResultForDisplay(contentStructure);
      const expected = {
        data: [{ id: 'aK3T27MRliBIxYKfHSxSF', status: 'active' }],
      };
      expect(result).toEqual(expected);
    });

    it('should handle content structure with non-JSON text', () => {
      const contentStructure = {
        content: [{ type: 'text', text: 'Simple text content' }],
      };
      expect(formatToolResultForDisplay(contentStructure)).toBe(
        'Simple text content',
      );
    });

    it('should handle regular objects and return them as-is', () => {
      const regularObject = { key: 'value', nested: { data: [1, 2, 3] } };
      const result = formatToolResultForDisplay(regularObject);
      expect(result).toEqual(regularObject);
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
      expect(result).toEqual(expectedData);
    });

    it('should handle arrays as input and return them as-is', () => {
      const arrayInput = [{ id: 1 }, { id: 2 }];
      const result = formatToolResultForDisplay(arrayInput);
      expect(result).toEqual(arrayInput);
    });

    it('should handle invalid JSON strings gracefully', () => {
      const invalidJson = '{"key": value}';
      expect(formatToolResultForDisplay(invalidJson)).toBe(invalidJson);
    });

    it('should handle content structure with invalid nested data', () => {
      const invalidContentStructure = {
        content: [
          {
            type: 'text',
            text: null, // invalid text
          },
        ],
      } as any;
      // When content structure is invalid, it should not be recognized as ContentStructure
      // and should return the object as-is
      expect(formatToolResultForDisplay(invalidContentStructure)).toEqual(
        invalidContentStructure,
      );
    });

    it('should handle content structure with malformed JSON', () => {
      const contentWithMalformedJson = {
        content: [
          {
            type: 'text',
            text: '{"key": }', // malformed JSON
          },
        ],
      };
      expect(formatToolResultForDisplay(contentWithMalformedJson)).toBe(
        '{"key": }',
      );
    });

    it('should handle deeply nested objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              data: 'test',
            },
          },
        },
      };
      const result = formatToolResultForDisplay(deepObject);
      expect(result).toEqual(deepObject);
    });
  });

  describe('isContentStructure fail-safe tests', () => {
    it('should handle objects that throw errors during property access', () => {
      const problematicObject = {
        get content() {
          throw new Error('Access error');
        },
      };
      // Should return false when property access throws an error
      expect(isContentStructure(problematicObject)).toBe(false);
    });

    it('should handle arrays with circular references', () => {
      const circularArray: any = [{ type: 'text', text: 'test' }];
      circularArray.push(circularArray);
      const objectWithCircularContent = { content: circularArray };
      expect(isContentStructure(objectWithCircularContent)).toBe(false);
    });

    it('should handle content arrays with objects that throw during iteration', () => {
      const problematicContent = {
        content: [
          {
            get type() {
              throw new Error('Type access error');
            },
            text: 'test',
          },
        ],
      };
      expect(isContentStructure(problematicContent)).toBe(false);
    });

    it('should handle extremely large content arrays', () => {
      const largeContent = {
        content: Array(10000).fill({ type: 'text', text: 'test' }),
      };
      expect(isContentStructure(largeContent)).toBe(true);
    });
  });
});
