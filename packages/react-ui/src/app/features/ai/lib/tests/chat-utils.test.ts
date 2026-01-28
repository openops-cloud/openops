import { UIMessage } from 'ai';
import { hasCompletedUIToolCalls } from '../chat-utils';

const createToolPart = (
  type: string,
  state: string,
  toolName?: string,
): any => ({
  type,
  toolCallId: 'call-1',
  state,
  input: {},
  output: state.startsWith('output') ? {} : undefined,
  ...(toolName && { toolName }),
});

describe('hasCompletedUIToolCalls', () => {
  describe('returns false for invalid messages', () => {
    it.each([
      ['empty array', []],
      [
        'user message',
        [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }],
      ],
      [
        'assistant with only text',
        [{ id: '1', role: 'assistant', parts: [{ type: 'text', text: 'Hi' }] }],
      ],
      [
        'assistant with text and reasoning',
        [
          {
            id: '1',
            role: 'assistant',
            parts: [
              { type: 'reasoning', text: 'Thinking...' },
              { type: 'text', text: 'Response' },
            ],
          },
        ],
      ],
      [
        'system message',
        [
          {
            id: '1',
            role: 'system',
            parts: [{ type: 'text', text: 'System prompt' }],
          },
        ],
      ],
      [
        'assistant with empty parts',
        [{ id: '1', role: 'assistant', parts: [] }],
      ],
    ])('%s', (_, messages) => {
      expect(hasCompletedUIToolCalls(messages as UIMessage[])).toBe(false);
    });
  });

  describe('UI tool states', () => {
    it.each([
      ['output-available', true],
      ['output-error', true],
      ['input-available', false],
      ['input-streaming', false],
    ])('static UI tool with state %s returns %s', (state, expected) => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            createToolPart('tool-ui-showChart', state),
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(expected);
    });

    it.each([
      ['output-available', true],
      ['output-error', true],
      ['input-available', false],
      ['input-streaming', false],
    ])('dynamic UI tool with state %s returns %s', (state, expected) => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            createToolPart('dynamic-tool', state, 'ui-customWidget'),
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(expected);
    });
  });

  describe('non-UI tools always return false', () => {
    it.each([
      [
        'static tool (tool-OpenOps_Documentation)',
        'tool-OpenOps_Documentation',
        undefined,
      ],
      [
        'dynamic tool (OpenOps_Documentation)',
        'dynamic-tool',
        'OpenOps_Documentation',
      ],
      [
        'static MCP tool (tool-mcp-server_getData)',
        'tool-mcp-server_getData',
        undefined,
      ],
    ])('%s', (_, type, toolName) => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            createToolPart(type, 'output-available', toolName),
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });
  });

  describe('backend tool with text parts', () => {
    it.each([
      ['error text', 'Prompt is too long'],
      ['success text', 'Here are the AWS templates...'],
    ])('returns false for backend tool with %s', (_, text) => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            createToolPart('tool-OpenOps_Documentation', 'output-available'),
            { type: 'text', text },
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(false);
    });

    it('returns true for UI tool even with error text', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            createToolPart('tool-ui-showData', 'output-available'),
            { type: 'text', text: 'Prompt is too long' },
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });
  });

  describe('mixed tool scenarios', () => {
    it.each<
      [string, [string, string, string?], [string, string, string?], boolean]
    >([
      [
        'UI and backend both completed returns true',
        ['tool-OpenOps_Documentation', 'output-available'],
        ['tool-ui-showChart', 'output-available'],
        true,
      ],
      [
        'UI pending, backend completed returns false',
        ['tool-OpenOps_Documentation', 'output-available'],
        ['tool-ui-showChart', 'input-available'],
        false,
      ],
      [
        'multiple UI tools all completed returns true',
        ['tool-ui-showChart', 'output-available'],
        ['tool-ui-showTable', 'output-available'],
        true,
      ],
      [
        'one UI completed, one UI pending returns false',
        ['tool-ui-showChart', 'output-available'],
        ['tool-ui-showTable', 'input-available'],
        false,
      ],
    ])('%s', (_, tool1, tool2, expected) => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            createToolPart(tool1[0], tool1[1], tool1[2]),
            createToolPart(tool2[0], tool2[1], tool2[2]),
          ],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(expected);
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
            createToolPart('tool-ui-showChart', 'output-available'),
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
            createToolPart('tool-ui-showChart', 'output-available'),
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
          parts: [createToolPart('tool-ui-showChart', 'output-available')],
        },
      ];
      expect(hasCompletedUIToolCalls(messages)).toBe(true);
    });
  });

  describe('only looks at last message', () => {
    it('returns false when last message is from user', () => {
      const messages: UIMessage[] = [
        {
          id: '1',
          role: 'assistant',
          parts: [
            { type: 'step-start' },
            createToolPart('tool-ui-showChart', 'output-available'),
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
