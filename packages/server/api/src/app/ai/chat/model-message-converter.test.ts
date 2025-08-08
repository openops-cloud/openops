import { ModelMessage } from 'ai';
import { convertToUIMessages } from './model-message-converter';

describe('ModelMessageConverter', () => {
  describe('convertToUIMessages', () => {
    it('should convert simple text messages', () => {
      const modelMessages: ModelMessage[] = [
        {
          role: 'user',
          content: 'Hello, how are you?',
        },
        {
          role: 'assistant',
          content: 'I am doing well, thank you for asking!',
        },
      ];

      const uiMessages = convertToUIMessages(modelMessages);

      expect(uiMessages).toHaveLength(2);
      expect(uiMessages[0]).toEqual({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Hello, how are you?',
            state: 'done',
          },
        ],
      });
      expect(uiMessages[1]).toEqual({
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'I am doing well, thank you for asking!',
            state: 'done',
          },
        ],
      });
    });

    it('should convert messages with structured content', () => {
      const modelMessages: ModelMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this data',
            },
          ],
        },
      ];

      const uiMessages = convertToUIMessages(modelMessages);

      expect(uiMessages[0]).toEqual({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Please analyze this data',
            state: 'done',
          },
        ],
      });
    });

    it('should convert system messages', () => {
      const modelMessages: ModelMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
      ];

      const uiMessages = convertToUIMessages(modelMessages);

      expect(uiMessages[0]).toEqual({
        role: 'system',
        parts: [
          {
            type: 'text',
            text: 'You are a helpful assistant.',
            state: 'done',
          },
        ],
      });
    });

    it('should handle tool calls', () => {
      const modelMessages: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'Let me check that for you.',
            },
            {
              type: 'tool-call',
              toolName: 'search',
              toolCallId: 'call_123',
              input: { query: 'test query' },
            },
          ],
        },
      ];

      const uiMessages = convertToUIMessages(modelMessages);

      expect(uiMessages[0].parts).toHaveLength(2);
      expect(uiMessages[0].parts[0]).toEqual({
        type: 'text',
        text: 'Let me check that for you.',
        state: 'done',
      });
      expect(uiMessages[0].parts[1]).toEqual({
        type: 'dynamic-tool',
        toolName: 'search',
        toolCallId: 'call_123',
        state: 'input-available',
        input: { query: 'test query' },
      });
    });
  });
});
