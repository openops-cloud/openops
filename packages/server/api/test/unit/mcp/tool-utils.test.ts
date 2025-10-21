/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModelMessage } from 'ai';
import { sanitizeMessages } from '../../../src/app/ai/mcp/tool-utils';

describe('sanitizeMessages', () => {
  describe('Tool call input sanitization', () => {
    it.each([
      {
        description: 'string input with valid JSON',
        input: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_vrtx_01DDTeUXy5F5Jix3vgXBVT2B',
                toolName: 'get_table_fields',
                input: '{"table_id": "1"}',
              },
            ],
          },
        ] as ModelMessage[],
        expected: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_vrtx_01DDTeUXy5F5Jix3vgXBVT2B',
                toolName: 'get_table_fields',
                input: { table_id: '1' },
              },
            ],
          },
        ],
      },
      {
        description: 'string input with invalid JSON',
        input: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_abc123',
                toolName: 'some_tool',
                input: 'not a valid json',
              },
            ],
          },
        ] as ModelMessage[],
        expected: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_abc123',
                toolName: 'some_tool',
                input: { error: 'Malformed input. Input must be an object.' },
              },
            ],
          },
        ],
      },
      {
        description: 'object input (already valid)',
        input: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_xyz789',
                toolName: 'another_tool',
                input: { param: 'value' },
              },
            ],
          },
        ] as ModelMessage[],
        expected: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_xyz789',
                toolName: 'another_tool',
                input: { param: 'value' },
              },
            ],
          },
        ],
      },
      {
        description: 'empty string input',
        input: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_empty',
                toolName: 'test_tool',
                input: '',
              },
            ],
          },
        ] as ModelMessage[],
        expected: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_empty',
                toolName: 'test_tool',
                input: { error: 'Malformed input. Input must be an object.' },
              },
            ],
          },
        ],
      },
      {
        description: 'string input with complex nested JSON',
        input: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_nested',
                toolName: 'complex_tool',
                input:
                  '{"user": {"id": 123, "name": "Test"}, "items": [1, 2, 3]}',
              },
            ],
          },
        ] as ModelMessage[],
        expected: [
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: 'toolu_nested',
                toolName: 'complex_tool',
                input: { user: { id: 123, name: 'Test' }, items: [1, 2, 3] },
              },
            ],
          },
        ],
      },
    ])(
      'should handle $description',
      ({ input, expected }: { input: ModelMessage[]; expected: any }) => {
        const result = sanitizeMessages(input);
        expect(result).toEqual(expected);
      },
    );
  });

  describe('Multiple tool calls in a single message', () => {
    it('should sanitize multiple tool calls with mixed input types', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'tool1',
              input: '{"valid": "json"}',
            },
            {
              type: 'tool-call',
              toolCallId: 'call2',
              toolName: 'tool2',
              input: { already: 'object' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call3',
              toolName: 'tool3',
              input: 'invalid json',
            },
          ],
        },
      ] as ModelMessage[];

      const result = sanitizeMessages(messages);

      expect(result).toEqual([
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'tool1',
              input: { valid: 'json' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call2',
              toolName: 'tool2',
              input: { already: 'object' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call3',
              toolName: 'tool3',
              input: { error: 'Malformed input. Input must be an object.' },
            },
          ],
        },
      ]);
    });
  });

  describe('Mixed content types', () => {
    it('should only sanitize tool-call content and leave other content types unchanged', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Here is some text',
            },
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'tool1',
              input: '{"key": "value"}',
            },
          ],
        },
      ] as ModelMessage[];

      const result = sanitizeMessages(messages);

      expect(result).toEqual([
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Here is some text',
            },
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'tool1',
              input: { key: 'value' },
            },
          ],
        },
      ]);
    });
  });

  describe('Non-array content', () => {
    it('should pass through messages with string content unchanged', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: 'Hello, this is a user message',
        },
      ] as ModelMessage[];

      const result = sanitizeMessages(messages);

      expect(result).toEqual(messages);
    });

    it('should pass through messages with non-array content unchanged', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: 'Simple text response',
        },
      ] as ModelMessage[];

      const result = sanitizeMessages(messages);

      expect(result).toEqual(messages);
    });
  });

  describe('Multiple messages', () => {
    it('should sanitize multiple messages independently', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: 'What is the weather?',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'get_weather',
              input: '{"city": "London"}',
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call1',
              toolName: 'get_weather',
              output: { temperature: '20C' },
            },
          ],
        },
      ] as ModelMessage[];

      const result = sanitizeMessages(messages);

      expect(result).toEqual([
        {
          role: 'user',
          content: 'What is the weather?',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'get_weather',
              input: { city: 'London' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call1',
              toolName: 'get_weather',
              output: { temperature: '20C' },
            },
          ],
        },
      ]);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty messages array', () => {
      const messages: ModelMessage[] = [];
      const result = sanitizeMessages(messages);
      expect(result).toEqual([]);
    });

    it('should handle messages with empty content array', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [],
        },
      ] as ModelMessage[];

      const result = sanitizeMessages(messages);
      expect(result).toEqual(messages);
    });

    it('should preserve other tool-call properties', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'some_tool',
              input: '{"test": true}',
              metadata: { custom: 'data' },
            } as any,
          ],
        },
      ] as ModelMessage[];

      const result = sanitizeMessages(messages);

      expect(result[0].content[0]).toMatchObject({
        type: 'tool-call',
        toolCallId: 'call1',
        toolName: 'some_tool',
        input: { test: true },
        metadata: { custom: 'data' },
      });
    });
  });
});
