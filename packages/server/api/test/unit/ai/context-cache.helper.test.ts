import { ModelMessage, ToolSet } from 'ai';
import {
  addCacheControlToMessages,
  addCacheControlToTools,
} from '../../../src/app/ai/chat/context-cache.helper';

describe('context-cache-helper', () => {
  describe('addCacheControlToMessages', () => {
    const systemPrompt = 'You are a helpful assistant.';

    const createUserMessage = (content: string): ModelMessage => ({
      role: 'user',
      content,
    });

    const createAssistantMessage = (content: string): ModelMessage => ({
      role: 'assistant',
      content,
    });

    it('should add cache control to system prompt', () => {
      const messages: ModelMessage[] = [createUserMessage('Hello')];

      const result = addCacheControlToMessages(messages, systemPrompt);

      expect(result[0]).toEqual({
        role: 'system',
        content: systemPrompt,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      });
    });

    it('should add cache control to last user message', () => {
      const messages: ModelMessage[] = [
        createUserMessage('Message 1'),
        createAssistantMessage('Response 1'),
        createUserMessage('Message 2'),
      ];

      const result = addCacheControlToMessages(messages, systemPrompt);

      // System message is at index 0, original messages start at 1
      const lastUserMessage = result[result.length - 1];
      expect(lastUserMessage.role).toBe('user');
      expect(lastUserMessage.content).toBe('Message 2');
      expect(lastUserMessage.providerOptions).toEqual({
        anthropic: { cacheControl: { type: 'ephemeral' } },
      });
    });

    it('should only cache system prompt and last user message', () => {
      const messages: ModelMessage[] = [
        createUserMessage('Message 1'),
        createAssistantMessage('Response 1'),
        createUserMessage('Message 2'),
        createAssistantMessage('Response 2'),
        createUserMessage('Message 3'),
        createAssistantMessage('Response 3'),
        createUserMessage('Message 4'),
      ];

      const result = addCacheControlToMessages(messages, systemPrompt);

      const cachedMessages = result.filter(
        (msg) => msg.providerOptions?.anthropic?.cacheControl,
      );

      // Should have exactly 2: system prompt + last user message
      expect(cachedMessages.length).toBe(2);
      expect(cachedMessages[0].role).toBe('system');
      expect(cachedMessages[1].role).toBe('user');
      expect(cachedMessages[1].content).toBe('Message 4');
    });

    it('should handle empty messages array', () => {
      const messages: ModelMessage[] = [];

      const result = addCacheControlToMessages(messages, systemPrompt);

      // Should only have system message
      expect(result.length).toBe(1);
      expect(result[0].role).toBe('system');
    });

    it('should handle messages with no user messages', () => {
      const messages: ModelMessage[] = [
        createAssistantMessage('Response 1'),
        createAssistantMessage('Response 2'),
        createAssistantMessage('Response 3'),
      ];

      const result = addCacheControlToMessages(messages, systemPrompt);

      const cachedMessages = result.filter(
        (msg) => msg.providerOptions?.anthropic?.cacheControl,
      );

      // Should only have system message cached, no user messages
      expect(cachedMessages.length).toBe(1);
      expect(result[0].role).toBe('system');
    });

    it('should handle messages with complex content types', () => {
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' },
          ],
        },
      ];

      const result = addCacheControlToMessages(messages, systemPrompt);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].role).toBe('system');
    });

    it('should preserve original message content', () => {
      const messages: ModelMessage[] = [
        createUserMessage('Message 1'),
        createAssistantMessage('Response 1'),
        createUserMessage('Message 2'),
      ];

      const result = addCacheControlToMessages(messages, systemPrompt);

      // First message should be system
      expect(result[0].role).toBe('system');
      expect(result[0].content).toBe(systemPrompt);

      // Should have original message count + 1
      expect(result.length).toBe(messages.length + 1);
    });

    it('should cache only the last user message when multiple exist', () => {
      const messages: ModelMessage[] = [
        createUserMessage('Message 1'),
        createAssistantMessage('Response 1'),
        createUserMessage('Message 2'),
        createAssistantMessage('Response 2'),
        createUserMessage('Message 3'),
      ];

      const result = addCacheControlToMessages(messages, systemPrompt);

      // Find all user messages with cache control
      const cachedUserMessages = result.filter(
        (msg) =>
          msg.role === 'user' && msg.providerOptions?.anthropic?.cacheControl,
      );

      // Should only cache the last user message
      expect(cachedUserMessages.length).toBe(1);
      expect(cachedUserMessages[0].content).toBe('Message 3');
    });
  });

  describe('addCacheControlToTools', () => {
    it('should add cache control only to the last tool', () => {
      const mockTool = {
        description: 'A mock tool',
        execute: async (): Promise<{ success: boolean }> => ({ success: true }),
      };

      const tools: ToolSet = {
        tool1: mockTool,
        tool2: mockTool,
        tool3: mockTool,
      };

      const result = addCacheControlToTools(tools);

      expect(result).toBeDefined();
      if (!result) {
        return;
      }

      // Check only the last tool has cache control
      expect(result.tool1.providerOptions).toBeUndefined();
      expect(result.tool2.providerOptions).toBeUndefined();
      expect(result.tool3.providerOptions).toEqual({
        anthropic: { cacheControl: { type: 'ephemeral' } },
      });
    });

    it('should return undefined when no tools are provided', () => {
      const result = addCacheControlToTools(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle empty tools object', () => {
      const tools: ToolSet = {};
      const result = addCacheControlToTools(tools);

      expect(result).toBeDefined();
      expect(Object.keys(result ?? {})).toEqual([]);
    });

    it('should preserve all tool properties except adding cache control to last', () => {
      const mockExecute1 = async (): Promise<{ result: string }> => ({
        result: 'test1',
      });
      const mockExecute2 = async (): Promise<{ result: string }> => ({
        result: 'test2',
      });

      const tools: ToolSet = {
        firstTool: {
          description: 'First tool',
          execute: mockExecute1,
        },
        lastTool: {
          description: 'Last tool',
          execute: mockExecute2,
        },
      };

      const result = addCacheControlToTools(tools);

      expect(result).toBeDefined();
      if (!result) {
        return;
      }

      // First tool should not have cache control
      expect(result.firstTool.description).toBe('First tool');
      expect(result.firstTool.execute).toBe(mockExecute1);
      expect(result.firstTool.providerOptions).toBeUndefined();

      // Last tool should have cache control
      expect(result.lastTool.description).toBe('Last tool');
      expect(result.lastTool.execute).toBe(mockExecute2);
      expect(result.lastTool.providerOptions).toEqual({
        anthropic: { cacheControl: { type: 'ephemeral' } },
      });
    });

    it('should add cache control to single tool', () => {
      const mockExecute = async (): Promise<{ result: string }> => ({
        result: 'test',
      });

      const tools: ToolSet = {
        onlyTool: {
          description: 'Only tool',
          execute: mockExecute,
        },
      };

      const result = addCacheControlToTools(tools);

      expect(result).toBeDefined();
      if (!result) {
        return;
      }

      expect(result.onlyTool.providerOptions).toEqual({
        anthropic: { cacheControl: { type: 'ephemeral' } },
      });
    });

    it('should maintain tool order', () => {
      const mockTool = {
        description: 'A mock tool',
        execute: async (): Promise<{ success: boolean }> => ({ success: true }),
      };

      const tools: ToolSet = {
        alpha: mockTool,
        beta: mockTool,
        gamma: mockTool,
      };

      const result = addCacheControlToTools(tools);

      expect(result).toBeDefined();
      if (!result) {
        return;
      }

      const keys = Object.keys(result);
      expect(keys).toEqual(['alpha', 'beta', 'gamma']);

      // Only gamma (last tool) should have cache control
      expect(result.gamma.providerOptions).toEqual({
        anthropic: { cacheControl: { type: 'ephemeral' } },
      });
    });
  });
});
