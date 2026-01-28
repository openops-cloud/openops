import { UIMessage } from 'ai';
import { hasCompletedUIToolCalls } from '../chat-utils';

/**
 * Tests for hasCompletedUIToolCalls function.
 *
 * This function determines when to auto-send messages back to the LLM.
 * It only returns true for UI tools (prefixed with 'ui-') to prevent
 * infinite retry loops when backend/MCP tools return large data that
 * exceeds the LLM's token limit.
 *
 * Issue Context (from repro-prompt-too-large.json):
 * - Tool call returns too much data, LLM throws "Prompt is too long"
 * - The ai-sdk's lastAssistantMessageIsCompleteWithToolCalls returns true
 *   for ANY completed tool, causing sendAutomaticallyWhen to trigger
 * - This creates an infinite retry loop
 *
 * Solution:
 * - hasCompletedUIToolCalls only returns true for UI tools (ui-* prefix)
 * - Backend/MCP tools are handled server-side and don't need auto-send
 */

describe('hasCompletedUIToolCalls', () => {
  describe('basic behavior', () => {
    it('returns false for empty messages array', () => {
      const result = hasCompletedUIToolCalls([]);
      expect(result).toBe(false);
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

  describe('CRITICAL: repro-prompt-too-large.json scenario', () => {
    /**
     * This test reproduces the exact issue from repro-prompt-too-large.json:
     * 1. User asks "get from docs aws templates available"
     * 2. OpenOps_Documentation tool executes and returns large data
     * 3. LLM throws "Prompt is too long" error (added as text part)
     * 4. sendAutomaticallyWhen should NOT trigger auto-send
     */
    it('returns false for backend tool with "Prompt is too long" error', () => {
      const messages: UIMessage[] = [
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: 'get docs' }],
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: "I don't have access to a tool to retrieve documentation directly.",
            },
          ],
        },
        {
          id: 'user-2',
          role: 'user',
          parts: [
            { type: 'text', text: 'get from docs aws templates available' },
          ],
        },
        {
          id: 'assistant-2',
          role: 'assistant',
          parts: [
            {
              type: 'reasoning',
              text: 'Searching OpenOps documentation for available AWS templates...',
            },
            { type: 'step-start' },
            {
              type: 'tool-OpenOps_Documentation',
              toolCallId: 'toolu_vrtx_014xu4P2LtCC84JMGmciw6X6',
              state: 'output-available',
              input: { query: 'AWS templates' },
              output: {
                success: true,
                query: 'AWS templates',
                queryResult: '... very large data truncated',
              },
            } as any,
            {
              type: 'text',
              text: 'Prompt is too long',
            },
          ],
        },
      ];

      // Must return false to prevent infinite retry loop
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
              output: {
                success: true,
                query: 'AWS templates',
                queryResult: 'Normal sized response',
              },
            } as any,
            { type: 'text', text: 'Here are the AWS templates...' },
          ],
        },
      ];

      // Backend tools should never trigger auto-send
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('ignores error text parts - only checks tool types', () => {
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
            // Error text doesn't affect the result for UI tools
            { type: 'text', text: 'Prompt is too long' },
          ],
        },
      ];

      // UI tool completed, so returns true (error text is ignored)
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
            { type: 'step-start' }, // New step starts here
            // Last step has no UI tools
            { type: 'text', text: 'Here is the result' },
          ],
        },
      ];
      // Should be false because the last step has no UI tools
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
            { type: 'step-start' }, // New step
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
      // Should still work - treats entire message as the "step"
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles undefined message parts', () => {
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
      // Last message is from user, so returns false
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });
  });
});
