/* eslint-disable @typescript-eslint/no-explicit-any */
import { CoreMessage } from 'ai';
import { mergeToolResultsIntoMessages } from '../../../src/app/ai/chat/utils';

describe('mergeToolResultsIntoMessages', () => {
  describe('basic message handling', () => {
    it('should handle empty array', () => {
      const result = mergeToolResultsIntoMessages([]);
      expect(result).toEqual([]);
    });

    it('should handle single user message with string content', () => {
      const messages: CoreMessage[] = [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Hello, how are you?',
          },
        ],
      });
    });

    it('should handle single assistant message with string content', () => {
      const messages: CoreMessage[] = [
        {
          role: 'assistant',
          content: 'I am doing well, thank you!',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I am doing well, thank you!',
          },
        ],
      });
    });

    it('should handle message with array content', () => {
      const messages: CoreMessage[] = [
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
        content: [
          {
            type: 'text',
            text: 'What is the weather like?',
          },
        ],
      });
    });

    it('should handle message with mixed string and object content in array', () => {
      const messages: CoreMessage[] = [
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
      });
    });

    it('should handle message with object content', () => {
      const messages: CoreMessage[] = [
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
        content: [
          {
            type: 'text',
            text: 'Custom object content',
          },
        ],
      });
    });
  });

  describe('tool result merging', () => {
    it('should merge tool result into assistant message with matching toolCallId', () => {
      const messages: CoreMessage[] = [
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
              args: { location: 'New York' },
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
              result: { temperature: 72, condition: 'sunny' },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toHaveLength(2);
      expect(result[0].content[0]).toEqual({
        type: 'text',
        text: 'I will help you with that.',
      });
      expect(result[0].content[1]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_123',
        toolName: 'get_weather',
        args: { location: 'New York' },
        result: { temperature: 72, condition: 'sunny' },
      });
    });

    it('should handle multiple tool calls and results', () => {
      const messages: CoreMessage[] = [
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
              args: { userId: '123' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call_2',
              toolName: 'get_weather',
              args: { location: 'London' },
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
              result: { name: 'John Doe', email: 'john@example.com' },
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
              result: { temperature: 15, condition: 'rainy' },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toHaveLength(3);

      expect(result[0].content[1]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_1',
        toolName: 'get_user_info',
        args: { userId: '123' },
        result: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(result[0].content[2]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_2',
        toolName: 'get_weather',
        args: { location: 'London' },
        result: { temperature: 15, condition: 'rainy' },
      });
    });

    it('should not merge tool result if no matching toolCallId found', () => {
      const messages: CoreMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              args: { location: 'New York' },
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
              result: { temperature: 72, condition: 'sunny' },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[0].content[0]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_123',
        toolName: 'get_weather',
        args: { location: 'New York' },
      });
      expect((result[0].content[0] as any).result).toBeUndefined();
      expect(result[1].role).toBe('tool');
    });

    it('should handle tool message with non-array content', () => {
      const messages: CoreMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              args: { location: 'New York' },
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
              result: 'This should not be processed as a tool result',
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('assistant');
      expect(result[1].role).toBe('tool');
      expect(result[1].content).toEqual([
        {
          type: 'tool-result',
          toolCallId: 'call_invalid',
          toolName: 'invalid_tool',
          result: 'This should not be processed as a tool result',
        },
      ]);
    });
  });

  describe('message sequence handling', () => {
    it('should handle conversation with multiple messages', () => {
      const messages: CoreMessage[] = [
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
              args: { location: 'default' },
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
              result: { temperature: 75, condition: 'partly cloudy' },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(4);

      const assistantMessage = result[3];
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content[1]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_123',
        toolName: 'get_weather',
        args: { location: 'default' },
        result: { temperature: 75, condition: 'partly cloudy' },
      });
    });

    it('should preserve message order and metadata', () => {
      const messages: CoreMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          id: 'msg_1',
          createdAt: new Date('2023-01-01'),
        } as CoreMessage,
        {
          role: 'assistant',
          content: 'Hi!',
          id: 'msg_2',
          createdAt: new Date('2023-01-01'),
          annotations: [{ type: 'test', value: 'annotation' }],
        } as CoreMessage,
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect((result[0] as any).id).toBe('msg_1');
      expect((result[0] as any).createdAt).toEqual(new Date('2023-01-01'));
      expect((result[1] as any).id).toBe('msg_2');
      expect((result[1] as any).annotations).toEqual([
        { type: 'test', value: 'annotation' },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle null or undefined content gracefully', () => {
      const messages: CoreMessage[] = [
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
      expect(result[0].content).toEqual([]);
      expect(result[1].content).toEqual([]);
    });

    it('should handle empty string content', () => {
      const messages: CoreMessage[] = [
        {
          role: 'user',
          content: '',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].content).toEqual([
        {
          type: 'text',
          text: '',
        },
      ]);
    });

    it('should handle empty array content', () => {
      const messages: CoreMessage[] = [
        {
          role: 'user',
          content: [],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].content).toEqual([]);
    });

    it('should handle tool message with empty content array', () => {
      const messages: CoreMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              args: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[1].role).toBe('tool');
      expect(result[1].content).toEqual([]);
    });

    it('should handle tool message with missing toolCallId', () => {
      const messages: CoreMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              args: { location: 'New York' },
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
              result: { temperature: 72, condition: 'sunny' },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[1].role).toBe('tool');
    });

    it('should handle tool message with string content instead of tool-result', () => {
      const messages: CoreMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              toolName: 'get_weather',
              args: { location: 'New York' },
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
              result: 'This is not a tool result',
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[1].role).toBe('tool');
      expect(result[1].content).toEqual([
        {
          type: 'tool-result',
          toolCallId: 'call_invalid',
          toolName: 'invalid_tool',
          result: 'This is not a tool result',
        },
      ]);
    });
  });

  describe('type safety', () => {
    it('should return MessageWithMergedToolResults[] type', () => {
      const messages: CoreMessage[] = [
        {
          role: 'user',
          content: 'Test message',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('content');
      expect(Array.isArray(result[0].content)).toBe(true);
    });

    it('should handle system messages', () => {
      const messages: CoreMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('system');
      expect(result[0].content).toEqual([
        {
          type: 'text',
          text: 'You are a helpful assistant.',
        },
      ]);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple assistant messages with tool calls', () => {
      const messages: CoreMessage[] = [
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
              args: { userId: '123' },
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
              result: { name: 'John', email: 'john@example.com' },
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
              args: { location: 'New York' },
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
              result: { temperature: 72, condition: 'sunny' },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(3);

      expect(result[1].role).toBe('assistant');
      expect(result[1].content[0]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_1',
        toolName: 'get_user_info',
        args: { userId: '123' },
        result: { name: 'John', email: 'john@example.com' },
      });

      expect(result[2].role).toBe('assistant');
      expect(result[2].content[1]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_2',
        toolName: 'get_weather',
        args: { location: 'New York' },
        result: { temperature: 72, condition: 'sunny' },
      });
    });

    it('should handle tool calls without corresponding tool results', () => {
      const messages: CoreMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'get_weather',
              args: { location: 'New York' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call_2',
              toolName: 'get_user_info',
              args: { userId: '123' },
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
              result: { temperature: 72, condition: 'sunny' },
            },
          ],
        },
      ];

      const result = mergeToolResultsIntoMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toHaveLength(2);

      expect(result[0].content[0]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_1',
        toolName: 'get_weather',
        args: { location: 'New York' },
        result: { temperature: 72, condition: 'sunny' },
      });

      expect(result[0].content[1]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_2',
        toolName: 'get_user_info',
        args: { userId: '123' },
      });
      expect((result[0].content[1] as any).result).toBeUndefined();
    });
  });
});
