import { parseUserMessage } from '../message-parser';

describe('parseUserMessage', () => {
  describe('valid string messages', () => {
    test.each([
      ['simple text', 'Hello', 'Hello'],
      ['empty string', '', ''],
      ['multiline text', 'Hello\nWorld', 'Hello\nWorld'],
      ['special characters', 'Hello @user #channel!', 'Hello @user #channel!'],
    ])('should handle %s', (_description, input, expected) => {
      const result = parseUserMessage(input);
      expect(result).toEqual({
        isValid: true,
        content: expected,
      });
    });
  });

  describe('valid UIMessage format', () => {
    test.each([
      [
        'text message',
        {
          role: 'user' as const,
          parts: [{ type: 'text', text: 'Hello world' }],
        },
        'Hello world',
      ],
      [
        'message with multiple parts',
        {
          role: 'user' as const,
          parts: [
            { type: 'text', text: 'First part' },
            { type: 'text', text: 'Second part' },
          ],
        },
        'First part',
      ],
      [
        'message with tool-ui at the end',
        {
          role: 'user' as const,
          parts: [
            { type: 'text', text: 'Use this tool' },
            { type: 'tool-ui-call', toolName: 'ui-search' },
          ],
        },
        'Use this tool',
      ],
      [
        'assistant message',
        {
          role: 'assistant' as const,
          parts: [{ type: 'text', text: 'Assistant response' }],
        },
        'Assistant response',
      ],
    ])('should extract text from %s', (_description, message, expected) => {
      const result = parseUserMessage(message);
      expect(result).toEqual({
        isValid: true,
        content: expected,
      });
    });
  });

  describe('empty text handling', () => {
    test.each([
      [
        'undefined text',
        {
          role: 'user' as const,
          parts: [{ type: 'text', text: undefined }],
        },
      ],
      [
        'null text',
        {
          role: 'user' as const,
          parts: [{ type: 'text', text: null }],
        },
      ],
    ])('should default to "continue" for %s', (_description, message) => {
      const result = parseUserMessage(message);
      expect(result).toEqual({
        isValid: true,
        content: 'continue',
      });
    });
  });

  describe('tool-ui messages', () => {
    test.each([
      [
        'tool-ui-call type',
        {
          role: 'user' as const,
          parts: [{ type: 'tool-ui-call', toolName: 'ui-search', args: {} }],
        },
      ],
      [
        'tool-ui-result type',
        {
          role: 'user' as const,
          parts: [{ type: 'tool-ui-result', output: 'data' }],
        },
      ],
    ])('should allow %s without text element', (_description, message) => {
      const result = parseUserMessage(message);
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid messages', () => {
    test.each([
      [
        'empty parts array',
        {
          role: 'user' as const,
          parts: [],
        },
      ],
      [
        'non-object first element',
        {
          role: 'user' as const,
          parts: ['string element'],
        },
      ],
      [
        'missing text property without tool-ui',
        {
          role: 'user' as const,
          parts: [{ type: 'unknown', data: 'something' }],
        },
      ],
      [
        'undefined first element',
        {
          role: 'user' as const,
          parts: [undefined],
        },
      ],
      [
        'null first element',
        {
          role: 'user' as const,
          parts: [null],
        },
      ],
    ])('should return error for %s', (_description, message) => {
      const result = parseUserMessage(message);
      expect(result).toEqual({
        isValid: false,
        errorMessage: expect.any(String),
      });
    });
  });

  describe('edge cases', () => {
    it('should handle numeric text values', () => {
      const message = {
        role: 'user' as const,
        parts: [{ type: 'text', text: 123 }],
      };
      const result = parseUserMessage(message);
      expect(result).toEqual({
        isValid: true,
        content: '123',
      });
    });

    it('should handle boolean text values', () => {
      const message = {
        role: 'user' as const,
        parts: [{ type: 'text', text: false }],
      };
      const result = parseUserMessage(message);
      expect(result).toEqual({
        isValid: true,
        content: 'false',
      });
    });

    it('should validate tool-ui in last element, not first', () => {
      const message = {
        role: 'user' as const,
        parts: [
          { type: 'other', data: 'no-text' },
          { type: 'tool-ui-result', output: 'tool output' },
        ],
      };
      const result = parseUserMessage(message);
      expect(result.isValid).toBe(true);
      if (result.isValid) {
        expect(result.content).toBe('continue');
      }
    });
  });
});
