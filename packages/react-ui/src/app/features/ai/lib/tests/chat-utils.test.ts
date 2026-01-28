import { UIMessage } from 'ai';
import { hasCompletedUIToolCalls } from '../chat-utils';

describe('hasCompletedUIToolCalls', () => {
  describe('basic behavior', () => {
    it('returns false for empty messages array', () => {
      expect(hasCompletedUIToolCalls([])).toBe(false);
    });

    it('returns false when last message is from user', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns false when assistant message has no tool calls', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello, how can I help?' }],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns false when assistant message has only text and reasoning parts', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Thinking...' },
            { type: 'text', text: 'Here is my response.' },
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });
  });

  describe('UI tool detection (ui-* prefix)', () => {
    it('returns true for completed static UI tool (tool-ui-*)', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-available',
              input: { data: [] },
              output: { rendered: true },
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });

    it('returns true for completed dynamic UI tool (dynamic-tool with ui- prefix)', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'dynamic-tool',
              toolName: 'ui-customWidget',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });

    it('returns true when UI tool has output-error state', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-error',
              input: { data: [] },
              errorText: 'Failed to render chart',
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });

    it('returns false when UI tool is still pending (input-available)', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'input-available',
              input: { data: [] },
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns false when UI tool is streaming (input-streaming)', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'input-streaming',
              input: undefined,
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });
  });

  describe('non-UI tool filtering (backend/MCP tools)', () => {
    it('returns false for completed static non-UI tool', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-OpenOps_Documentation',
              toolCallId: 'call-1',
              state: 'output-available',
              input: { query: 'test' },
              output: { data: 'result' },
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns false for completed dynamic non-UI tool', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'dynamic-tool',
              toolName: 'OpenOps_Documentation',
              toolCallId: 'call-1',
              state: 'output-available',
              input: { query: 'test' },
              output: { data: 'result' },
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns false for MCP tool with large output', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-mcp-server_getData',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: { largeData: 'x'.repeat(100000) },
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });
  });

  describe('backend tool with LLM error', () => {
    it('returns false for backend tool with error text', () => {
      const messages: UIMessage[] = [
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-OpenOps_Documentation',
              toolCallId: 'call-1',
              state: 'output-available',
              input: { query: 'AWS templates' },
              output: { success: true, queryResult: '... large data ...' },
            } as any,
            { type: 'text', text: 'Prompt is too long' },
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns false even when backend tool output is successful', () => {
      const messages: UIMessage[] = [
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-OpenOps_Documentation',
              toolCallId: 'call-1',
              state: 'output-available',
              input: { query: 'AWS templates' },
              output: { success: true, queryResult: 'Normal sized response' },
            } as any,
            { type: 'text', text: 'Here are the AWS templates...' },
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('ignores error text parts for UI tools', () => {
      const messages: UIMessage[] = [
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showData',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
            { type: 'text', text: 'Prompt is too long' },
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });
  });

  describe('mixed tool scenarios', () => {
    it('returns true when UI tool and backend tool are both completed', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-OpenOps_Documentation',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-2',
              state: 'output-available',
              input: { data: [] },
              output: { rendered: true },
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });

    it('returns false when UI tool is pending but backend tool is completed', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-OpenOps_Documentation',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-2',
              state: 'input-available',
              input: { data: [] },
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns true when multiple UI tools are all completed', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
            {
              type: 'tool-ui-showTable',
              toolCallId: 'call-2',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });

    it('returns false when one UI tool is completed but another is pending', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
            {
              type: 'tool-ui-showTable',
              toolCallId: 'call-2',
              state: 'input-available',
              input: {},
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });
  });

  describe('step boundary behavior', () => {
    it('only considers tools in the last step', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
            { type: 'step-start' },
            { type: 'text', text: 'Here is the result' },
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns true when last step has completed UI tool', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            { type: 'text', text: 'Let me help you.' },
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });

    it('handles message with no step-start parts', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty message parts', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('handles system messages', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'system',
          parts: [{ type: 'text', text: 'System prompt' }],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('only looks at the last message', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            {
              type: 'tool-ui-showChart',
              toolCallId: 'call-1',
              state: 'output-available',
              input: {},
              output: {},
            } as any,
          ],
        },
        {
          id: '2',
          role: 'user',
          parts: [{ type: 'text', text: 'Thanks!' }],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });
  });
});
