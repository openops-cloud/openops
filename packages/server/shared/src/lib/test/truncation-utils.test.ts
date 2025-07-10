/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { safeStringifyAndTruncate } from '../truncation-utils';

describe('safeStringifyAndTruncate', () => {
  describe('primitive values', () => {
    it.each([
      ['strings', 'hello world', 'hello world'],
      ['numbers', 42, '42'],
      ['boolean true', true, 'true'],
      ['boolean false', false, 'false'],
      ['null', null, 'null'],
      ['undefined', undefined, 'undefined'],
    ])('should handle %s', (_, input, expected) => {
      const result = safeStringifyAndTruncate(input);
      expect(result).toBe(expected);
    });
  });

  describe('objects', () => {
    it('should stringify simple objects', () => {
      const obj = { name: 'John', age: 30 };
      const result = safeStringifyAndTruncate(obj);
      expect(result).toBe(JSON.stringify(obj, null, 2));
    });

    it('should stringify nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          details: {
            age: 30,
            city: 'New York',
          },
        },
      };
      const result = safeStringifyAndTruncate(obj);
      expect(result).toBe(JSON.stringify(obj, null, 2));
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3, 'hello'];
      const result = safeStringifyAndTruncate(arr);
      expect(result).toBe(JSON.stringify(arr, null, 2));
    });

    it.each([
      ['empty objects', {}, '{}'],
      ['empty arrays', [], '[]'],
    ])('should handle %s', (_, input, expected) => {
      expect(safeStringifyAndTruncate(input)).toBe(expected);
    });
  });

  describe('circular references', () => {
    it('should handle circular references in objects', () => {
      const obj: { name: string; self?: unknown } = { name: 'John' };
      obj.self = obj;

      expect(() => {
        const result = safeStringifyAndTruncate(obj);
        // Should not throw an error and should contain the name property
        expect(result).toContain('John');
        expect(typeof result).toBe('string');
      }).not.toThrow();
    });

    it('should handle circular references in arrays', () => {
      const arr = [1, 2, 3];
      arr.push(arr as never);

      expect(() => {
        const result = safeStringifyAndTruncate(arr);
        // Should not throw an error and should contain the numbers
        expect(result).toContain('1');
        expect(result).toContain('2');
        expect(result).toContain('3');
        expect(typeof result).toBe('string');
      }).not.toThrow();
    });
  });

  describe('truncation', () => {
    it.each([
      [
        'strings longer than default maxLength',
        'a'.repeat(1500),
        'a'.repeat(1000) + '... [truncated]',
        1000 + '... [truncated]'.length,
      ],
      ['strings shorter than maxLength', 'a'.repeat(500), 'a'.repeat(500), 500],
      [
        'strings exactly at maxLength',
        'a'.repeat(1000),
        'a'.repeat(1000),
        1000,
      ],
    ])('should handle %s', (_, input, expectedOutput, expectedLength) => {
      const result = safeStringifyAndTruncate(input);
      expect(result).toBe(expectedOutput);
      expect(result.length).toBe(expectedLength);
    });

    it('should truncate large objects', () => {
      const largeObj = {
        data: 'x'.repeat(1500),
        moreData: 'y'.repeat(500),
      };
      const result = safeStringifyAndTruncate(largeObj);

      expect(result.length).toBe(1000 + '... [truncated]'.length);
      expect(result).toContain('... [truncated]');
    });
  });

  describe('custom parameters', () => {
    it.each([
      [
        'custom maxLength',
        'a'.repeat(100),
        50,
        undefined,
        'a'.repeat(50) + '... [truncated]',
        50 + '... [truncated]'.length,
      ],
      [
        'custom truncate message',
        'a'.repeat(100),
        50,
        '... [CUSTOM]',
        'a'.repeat(50) + '... [CUSTOM]',
        50 + '... [CUSTOM]'.length,
      ],
      [
        'both custom maxLength and message',
        'a'.repeat(200),
        30,
        ' [CUT]',
        'a'.repeat(30) + ' [CUT]',
        30 + ' [CUT]'.length,
      ],
    ])(
      'should use %s',
      (
        _,
        input,
        maxLength,
        truncateMessage,
        expectedOutput,
        expectedLength,
      ) => {
        const result = safeStringifyAndTruncate(
          input,
          maxLength,
          truncateMessage,
        );
        expect(result).toBe(expectedOutput);
        expect(result.length).toBe(expectedLength);
      },
    );
  });

  describe('error handling', () => {
    it('should handle objects that fail to stringify', () => {
      const problematicObj = {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        toJSON: () => {
          throw new Error('JSON serialization failed');
        },
      };

      const result = safeStringifyAndTruncate(problematicObj);
      // Should fallback to String() conversion
      expect(result).toBe('[object Object]');
    });

    it.each([
      [
        'BigInt values',
        BigInt('123456789012345678901234567890'),
        (value: unknown) => (value as bigint).toString(),
      ],
      [
        'Symbol values',
        Symbol('test'),
        (value: unknown) => (value as symbol).toString(),
      ],
      [
        'functions',
        () => 'hello',
        (value: unknown) => (value as () => string).toString(),
      ],
    ])('should handle %s', (_, input, expectedTransform) => {
      const result = safeStringifyAndTruncate(input);
      expect(result).toBe(expectedTransform(input));
    });
  });

  describe('edge cases', () => {
    it.each([
      ['zero maxLength', 'hello', 0, undefined, '... [truncated]'],
      ['negative maxLength', 'hello', -1, undefined, '... [truncated]'],
      ['empty string', '', undefined, undefined, ''],
      ['maxLength equal to string length', 'hello', 5, undefined, 'hello'],
      [
        'very small maxLength with long truncate message',
        'hello world',
        5,
        '... [very long truncate message]',
        'hello... [very long truncate message]',
      ],
    ])('should handle %s', (_, input, maxLength, truncateMessage, expected) => {
      const result = safeStringifyAndTruncate(
        input,
        maxLength,
        truncateMessage,
      );
      expect(result).toBe(expected);
    });
  });
});
