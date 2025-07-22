import { mergeToolResults } from './assistant-ui-utils';

describe('mergeToolResults', () => {
  describe('basic message handling', () => {
    it('should handle empty array', () => {
      const result = mergeToolResults([]);
      expect(result).toEqual([]);
    });

    it('should handle single user message with string content', () => {
      const messages = [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
      ];

      const result = mergeToolResults(messages);
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
      const messages = [
        {
          role: 'assistant',
          content: 'I am doing well, thank you!',
        },
      ];

      const result = mergeToolResults(messages);
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
      const messages = [
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

      const result = mergeToolResults(messages);
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
      const messages = [
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

      const result = mergeToolResults(messages);
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
      const messages = [
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

      const result = mergeToolResults(messages);
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
      const messages = [
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
              name: 'get_weather',
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
              result: { temperature: 72, condition: 'sunny' },
            },
          ],
        },
      ];

      const result = mergeToolResults(messages);
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
        name: 'get_weather',
        args: { location: 'New York' },
        result: { temperature: 72, condition: 'sunny' },
      });
    });

    it('should handle multiple tool calls and results', () => {
      const messages = [
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
              name: 'get_user_info',
              args: { userId: '123' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call_2',
              name: 'get_weather',
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
              result: { temperature: 15, condition: 'rainy' },
            },
          ],
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('assistant');
      expect(result[0].content).toHaveLength(3);

      // Check that both tool calls have their results merged
      expect(result[0].content[1]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_1',
        name: 'get_user_info',
        args: { userId: '123' },
        result: { name: 'John Doe', email: 'john@example.com' },
      });

      expect(result[0].content[2]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_2',
        name: 'get_weather',
        args: { location: 'London' },
        result: { temperature: 15, condition: 'rainy' },
      });
    });

    it('should not merge tool result if no matching toolCallId found', () => {
      const messages = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              name: 'get_weather',
              args: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call_456', // Different toolCallId
              result: { temperature: 72, condition: 'sunny' },
            },
          ],
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(1);
      expect(result[0].content[0]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_123',
        name: 'get_weather',
        args: { location: 'New York' },
        // No result should be added
      });
      expect((result[0].content[0] as any).result).toBeUndefined();
    });

    it('should handle tool message with non-array content', () => {
      const messages = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              name: 'get_weather',
              args: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: 'This should not be processed as a tool result',
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(2); // Tool message should be included as normal message
      expect(result[0].role).toBe('assistant');
      expect(result[1].role).toBe('tool');
      expect(result[1].content).toEqual([
        {
          type: 'text',
          text: 'This should not be processed as a tool result',
        },
      ]);
    });
  });

  describe('message sequence handling', () => {
    it('should handle conversation with multiple messages', () => {
      const messages = [
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
              name: 'get_weather',
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
              result: { temperature: 75, condition: 'partly cloudy' },
            },
          ],
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(4); // Tool message should be merged, not counted separately

      // Check that the tool result was merged into the assistant message
      const assistantMessage = result[3];
      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content[1]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_123',
        name: 'get_weather',
        args: { location: 'default' },
        result: { temperature: 75, condition: 'partly cloudy' },
      });
    });

    it('should preserve message order and metadata', () => {
      const messages = [
        {
          role: 'user',
          content: 'Hello',
          id: 'msg_1',
          createdAt: new Date('2023-01-01'),
        },
        {
          role: 'assistant',
          content: 'Hi!',
          id: 'msg_2',
          createdAt: new Date('2023-01-01'),
          annotations: [{ type: 'test', value: 'annotation' }],
        },
      ];

      const result = mergeToolResults(messages);
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
      const messages = [
        {
          role: 'user',
          content: null as any,
        },
        {
          role: 'assistant',
          content: undefined as any,
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(2);
      expect(result[0].content).toEqual([]);
      expect(result[1].content).toEqual([]);
    });

    it('should handle empty string content', () => {
      const messages = [
        {
          role: 'user',
          content: '',
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(1);
      expect(result[0].content).toEqual([
        {
          type: 'text',
          text: '',
        },
      ]);
    });

    it('should handle empty array content', () => {
      const messages = [
        {
          role: 'user',
          content: [],
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(1);
      expect(result[0].content).toEqual([]);
    });

    it('should handle tool message with empty content array', () => {
      const messages = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              name: 'get_weather',
              args: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [],
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(2); // Tool message should be included as normal message
      expect(result[1].role).toBe('tool');
      expect(result[1].content).toEqual([]);
    });

    it('should handle tool message with missing toolCallId', () => {
      const messages = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_123',
              name: 'get_weather',
              args: { location: 'New York' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              result: { temperature: 72, condition: 'sunny' },
              // Missing toolCallId
            },
          ],
        },
      ];

      const result = mergeToolResults(messages);
      expect(result).toHaveLength(2); // Tool message should be included as normal message
      expect(result[1].role).toBe('tool');
    });
  });

  describe('type safety', () => {
    it('should return ThreadMessageLike[] type', () => {
      const messages = [
        {
          role: 'user',
          content: 'Test message',
        },
      ];

      const result = mergeToolResults(messages);

      // TypeScript should infer this as ThreadMessageLike[]
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('content');
      expect(Array.isArray(result[0].content)).toBe(true);
    });
  });
});
