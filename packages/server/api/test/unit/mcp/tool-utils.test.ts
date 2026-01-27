/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToolResult } from '@openops/shared';
import { ModelMessage } from 'ai';
import {
  addMissingUiToolResults,
  createToolResultsMap,
  sanitizeMessages,
} from '../../../src/app/ai/mcp/tool-utils';

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
      ({
        input,
        expected,
      }: {
        input: ModelMessage[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expected: any;
      }) => {
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

describe('createToolResultsMap', () => {
  it('should create an empty map when no results provided', () => {
    const result = createToolResultsMap(undefined);
    expect(result.size).toBe(0);
  });

  it('should create an empty map when empty array provided', () => {
    const result = createToolResultsMap([]);
    expect(result.size).toBe(0);
  });

  it('should create a map indexed by toolCallId', () => {
    const toolResults: ToolResult[] = [
      { toolCallId: 'call1', toolName: 'ui-navigate', output: 'result1' },
      { toolCallId: 'call2', toolName: 'ui-search', output: 'result2' },
    ];

    const result = createToolResultsMap(toolResults);

    expect(result.size).toBe(2);
    expect(result.get('call1')).toEqual({
      toolCallId: 'call1',
      toolName: 'ui-navigate',
      output: 'result1',
    });
    expect(result.get('call2')).toEqual({
      toolCallId: 'call2',
      toolName: 'ui-search',
      output: 'result2',
    });
  });
});

describe('addMissingUiToolResults', () => {
  describe('empty frontend results', () => {
    it('should return history unchanged when no frontend results', () => {
      const chatHistory: ModelMessage[] = [
        {
          role: 'user',
          content: 'Navigate to flows',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'ui-navigate',
              input: { url: '/flows' },
            },
          ],
        },
      ] as ModelMessage[];

      const result = addMissingUiToolResults(chatHistory, new Map());

      expect(result).toEqual(chatHistory);
    });
  });

  describe('adding missing tool results', () => {
    it('should add tool-result for UI tool call without existing result', () => {
      const chatHistory: ModelMessage[] = [
        {
          role: 'user',
          content: 'Navigate to flows',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'ui-navigate',
              input: { url: '/flows' },
            },
          ],
        },
      ] as ModelMessage[];

      const frontendResults = createToolResultsMap([
        {
          toolCallId: 'call1',
          toolName: 'ui-navigate',
          output: 'Successfully navigated to /flows',
        },
      ]);

      const result = addMissingUiToolResults(chatHistory, frontendResults);

      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call1',
            toolName: 'ui-navigate',
            output: {
              type: 'text',
              value: 'Successfully navigated to /flows',
            },
          },
        ],
      });
    });

    it('should NOT add tool-result if one already exists in history', () => {
      const chatHistory: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'ui-navigate',
              input: { url: '/flows' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call1',
              toolName: 'ui-navigate',
              output: { type: 'text', value: 'Already exists' },
            },
          ],
        },
      ] as ModelMessage[];

      const frontendResults = createToolResultsMap([
        {
          toolCallId: 'call1',
          toolName: 'ui-navigate',
          output: 'New result that should be ignored',
        },
      ]);

      const result = addMissingUiToolResults(chatHistory, frontendResults);

      // Should not add duplicate, history unchanged
      expect(result).toHaveLength(2);
      expect(result).toEqual(chatHistory);
    });

    it('should handle multiple UI tool calls, adding only missing results', () => {
      const chatHistory: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'ui-navigate',
              input: { url: '/flows' },
            },
            {
              type: 'tool-call',
              toolCallId: 'call2',
              toolName: 'ui-search',
              input: { query: 'test' },
            },
          ],
        },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'call1',
              toolName: 'ui-navigate',
              output: { type: 'text', value: 'Existing result' },
            },
          ],
        },
      ] as ModelMessage[];

      const frontendResults = createToolResultsMap([
        {
          toolCallId: 'call1',
          toolName: 'ui-navigate',
          output: 'Should be ignored - already exists',
        },
        {
          toolCallId: 'call2',
          toolName: 'ui-search',
          output: 'Search completed',
        },
      ]);

      const result = addMissingUiToolResults(chatHistory, frontendResults);

      // Should add result for call2 only
      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call2',
            toolName: 'ui-search',
            output: {
              type: 'text',
              value: 'Search completed',
            },
          },
        ],
      });
    });

    it('should NOT add tool-result for non-UI tool calls', () => {
      const chatHistory: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'get_data',
              input: { id: '123' },
            },
          ],
        },
      ] as ModelMessage[];

      const frontendResults = createToolResultsMap([
        {
          toolCallId: 'call1',
          toolName: 'get_data',
          output: 'Some result',
        },
      ]);

      const result = addMissingUiToolResults(chatHistory, frontendResults);

      // Should not add - not a UI tool
      expect(result).toHaveLength(1);
      expect(result).toEqual(chatHistory);
    });

    it('should handle complex output objects by JSON stringifying them', () => {
      const chatHistory: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'ui-showTestRunDetails',
              input: { flowRun: { id: 'run-123' } },
            },
          ],
        },
      ] as ModelMessage[];

      const complexOutput = {
        message: 'Details shown',
        runId: 'run-123',
      };

      const frontendResults = createToolResultsMap([
        {
          toolCallId: 'call1',
          toolName: 'ui-showTestRunDetails',
          output: complexOutput,
        },
      ]);

      const result = addMissingUiToolResults(chatHistory, frontendResults);

      expect(result[1]).toEqual({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call1',
            toolName: 'ui-showTestRunDetails',
            output: {
              type: 'text',
              value: JSON.stringify(complexOutput),
            },
          },
        ],
      });
    });

    it('should skip tool calls without matching frontend results', () => {
      const chatHistory: ModelMessage[] = [
        {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call1',
              toolName: 'ui-navigate',
              input: { url: '/flows' },
            },
          ],
        },
      ] as ModelMessage[];

      const frontendResults = createToolResultsMap([
        {
          toolCallId: 'call2',
          toolName: 'ui-search',
          output: 'Different tool result',
        },
      ]);

      const result = addMissingUiToolResults(chatHistory, frontendResults);

      // No matching result for call1, so nothing added
      expect(result).toHaveLength(1);
      expect(result).toEqual(chatHistory);
    });
  });
});
