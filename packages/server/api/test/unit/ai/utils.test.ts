/* eslint-disable @typescript-eslint/no-explicit-any */
import { ModelMessage } from 'ai';
import { mergeToolResultsIntoMessages, sanitizeMessagesForChatName, } from '../../../src/app/ai/chat/utils';

describe('mergeToolResultsIntoMessages', () => {
  describe('basic message handling', () => {
    it('should handle empty array', () => {
      const result = mergeToolResultsIntoMessages([]);
      expect(result).toEqual([]);
    });

    it('should handle single user message with string content', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Hello, how are you?',
            state: 'done',

          },
        ],
      });
    });

    it('should handle single assistant message with string content', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: 'I am doing well, thank you!',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'I am doing well, thank you!',
            state: 'done',
          },
        ],
      });
    });

    it('should handle message with array content', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What is the weather like?',
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'What is the weather like?',
            state: 'done',
          },
        ],
      });
    });

    it('should handle message with mixed string and object content in array', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Hello! ',
            },
            {
              type: 'text',
              text: 'How can I help you today?',
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'Hello! ',
            state: 'done',
          },
          {
            type: 'text',
            text: 'How can I help you today?',
            state: 'done',
          },
        ],
      });
    });

    it('should handle message with object content', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Custom object content',
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Custom object content',
            state: 'done',
          },
        ],
      });
    });
  });

  describe('tool result merging', () => {
    it('should handle tool result using result field (no output) without throwing', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_abc',
              toolName: 'get_weather',
              input: { location: 'Paris' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_abc',
              toolName: 'get_weather',
              result: {
                type: 'json',
                value: { temperature: 20, condition: 'cloudy' },
              },
            } as any,
          ],
        },
      ];

      // Should not throw even if `output` is not provided
      expect(() => mergeToolResultsIntoMessages(messages)).not.toThrow();

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].parts[0]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_weather',
        toolCallId: 'call_abc',
        state: 'output-available',
        input: { location: 'Paris' },
        output: { temperature: 20, condition: 'cloudy' },
      });
    });
    it('should merge tool result into assistant message with matching toolCallId', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'I will help you with that.',
            },
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              output: {
                type: 'json',
                value: { temperature: 72, condition: 'sunny' },
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].parts).toHaveLength(2);
      expect(result[0].parts[0]).toEqual({
        type: 'text',
        text: 'I will help you with that.',
        state: 'done',
      });
      expect(result[0].parts[1]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_weather',
        toolCallId: 'call_123',
        state: 'output-available',
        input: { location: 'New York' },
        output: { temperature: 72, condition: 'sunny' },
      });
    });

    it('should handle multiple tool calls and results', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Let me get information for you.',
            },
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'get_user_info',
              input: { userId: '123' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call_2',
              toolName: 'get_weather',
              input: { location: 'London' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_1',
              toolName: 'get_user_info',
              output: {
                type: 'json',
                value: { name: 'John Doe', email: 'john@example.com' },
              },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_2',
              toolName: 'get_weather',
              output: {
                type: 'json',
                value: { temperature: 15, condition: 'rainy' },
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].parts).toHaveLength(3);

      expect(result[0].parts[1]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_user_info',
        toolCallId: 'call_1',
        state: 'output-available',
        input: { userId: '123' },
        output: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(result[0].parts[2]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_weather',
        toolCallId: 'call_2',
        state: 'output-available',
        input: { location: 'London' },
        output: { temperature: 15, condition: 'rainy' },
      });
    });

    it('should not merge tool result if no matching toolCallId found', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_456',
              toolName: 'get_weather',
              output: {
                type: 'json',
                value: { temperature: 72, condition: 'sunny' },
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].parts[0]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_weather',
        toolCallId: 'call_123',
        state: 'input-available',
        input: { location: 'New York' },
      });
    });

    it('should handle tool message with non-array content', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_invalid',
              toolName: 'invalid_tool',
              output: {
                type: 'text',
                value: 'This should not be processed as a tool result',
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
    });
  });

  describe('message sequence handling', () => {
    it('should handle conversation with multiple messages', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: 'Hi there! How can I help you?',
        },
        {
          role: 'user',
          content: 'What is the weather like?',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Let me check the weather for you.',
            },
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              input: { location: 'default' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              output: {
                type: 'json',
                value: { temperature: 75, condition: 'partly cloudy' },
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(4);

      const assistantMessage = result[3];
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.parts[1]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_weather',
        toolCallId: 'call_123',
        state: 'output-available',
        input: { location: 'default' },
        output: { temperature: 75, condition: 'partly cloudy' },
      });
    });

    it('should preserve message order', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: 'Hi!',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });
  });

  describe('edge cases', () => {
    it('should handle null or undefined content gracefully', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: null as any,
        },
        {
          role: 'assistant',
          content: undefined as any,
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[0].parts).toEqual([]);
      expect(result[1].parts).toEqual([]);
    });

    it('should handle empty string content', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: '',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].parts).toEqual([
        {
          type: 'text',
          text: '',
          state: 'done',
        },
      ]);
    });

    it('should handle empty array content', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: [],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].parts).toEqual([]);
    });

    it('should handle tool message with empty content array', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
    });

    it('should handle tool message with missing toolCallId', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_missing',
              toolName: 'get_weather',
              output: {
                type: 'json',
                value: { temperature: 72, condition: 'sunny' },
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
    });

    it('should handle tool message with string content instead of tool-result', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_invalid',
              toolName: 'invalid_tool',
              output: {
                type: 'text',
                value: 'This is not a tool result',
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
    });
  });

  describe('type safety', () => {
    it('should return UIMessage[] type', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: 'Test message',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('parts');
      expect(Array.isArray(result[0].parts)).toBe(true);
    });

    it('should handle system messages', () => {
      const messages: ModelMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('system');
      expect(result[0].parts).toEqual([
        {
          type: 'text',
          text: 'You are a helpful assistant.',
          state: 'done',
        },
      ]);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple assistant messages with tool calls', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: 'Get user info and weather',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'get_user_info',
              input: { userId: '123' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_1',
              toolName: 'get_user_info',
              output: {
                type: 'json',
                value: { name: 'John', email: 'john@example.com' },
              },
            },
          ],
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Now let me get the weather.',
            },
            {
              type: 'tool-call',
              toolCallId: 'call_2',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_2',
              toolName: 'get_weather',
              output: {
                type: 'json',
                value: { temperature: 72, condition: 'sunny' },
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(3);

      expect(result[1].role).toBe('assistant');
      expect(result[1].parts[0]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_user_info',
        toolCallId: 'call_1',
        state: 'output-available',
        input: { userId: '123' },
        output: { name: 'John', email: 'john@example.com' },
      });

      expect(result[2].role).toBe('assistant');
      expect(result[2].parts[1]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_weather',
        toolCallId: 'call_2',
        state: 'output-available',
        input: { location: 'New York' },
        output: { temperature: 72, condition: 'sunny' },
      });
    });

    it('should handle tool calls without corresponding tool results', () => {
      const messages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'get_weather',
              input: { location: 'New York' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call_2',
              toolName: 'get_user_info',
              input: { userId: '123' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_1',
              toolName: 'get_weather',
              output: {
                type: 'json',
                value: { temperature: 72, condition: 'sunny' },
              },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].parts).toHaveLength(2);

      expect(result[0].parts[0]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_weather',
        toolCallId: 'call_1',
        state: 'output-available',
        input: { location: 'New York' },
        output: { temperature: 72, condition: 'sunny' },
      });

      expect(result[0].parts[1]).toEqual({
        type: 'dynamic-tool',
        toolName: 'get_user_info',
        toolCallId: 'call_2',
        state: 'input-available',
        input: { userId: '123' },
      });
    });
  });
});

describe('sanitizeMessagesForChatName', () => {
  it('keeps only user and assistant roles, dropping tool messages', () => {
    const messages: ModelMessage[] = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hello ' },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'hi' } as any],
      },
      {
        role: 'tool',
        content: [{ toolCallId: 'x', type: 'tool_result', content: 'ok' } as any],
      },
    ];

    const result = sanitizeMessagesForChatName(messages);
    expect(result).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);
  });

  it('trims string content and removes empty messages after trim', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: '   ' },
      { role: 'assistant', content: '  answer  ' },
    ];

    const result = sanitizeMessagesForChatName(messages);
    expect(result).toEqual([{ role: 'assistant', content: 'answer' }]);
  });

  it('merges multiple text parts with newlines and trims overall', () => {
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Line 1' } as any,
          { type: 'text', text: 'Line 2' } as any,
        ],
      },
    ];

    const result = sanitizeMessagesForChatName(messages);
    expect(result).toEqual([{ role: 'user', content: 'Line 1\nLine 2' }]);
  });

  it('ignores non-text parts (e.g., tool_use, image) and keeps only text', () => {
    const messages: ModelMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 't1', name: 'X', input: {} } as any,
          { type: 'text', text: 'Only this is kept' } as any,
          { type: 'image', image: 'raw' } as any,
        ],
      },
    ];

    const result = sanitizeMessagesForChatName(messages);
    expect(result).toEqual([
      { role: 'assistant', content: 'Only this is kept' },
    ]);
  });

  it('returns empty array when nothing useful remains', () => {
    const messages: ModelMessage[] = [
      { role: 'system', content: 'not included' },
      { role: 'tool', content: [] as any },
      { role: 'user', content: [] as any },
    ];

    const result = sanitizeMessagesForChatName(messages);
    expect(result).toEqual([]);
  });
});
