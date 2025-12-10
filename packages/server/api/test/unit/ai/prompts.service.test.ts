const mockFetch = jest.fn();
const readFileMock = jest.fn();
const getMock = jest.fn();

global.fetch = mockFetch;

jest.mock('fs/promises', () => ({
  readFile: readFileMock,
}));

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
  },
  system: {
    get: getMock,
  },
  AppSystemProp: {
    AI_PROMPTS_LOCATION: 'AI_PROMPTS_LOCATION',
  },
}));

import { CODE_BLOCK_NAME, ChatFlowContext } from '@openops/shared';
import {
  buildUIContextSection,
  getBlockSystemPrompt,
} from '../../../src/app/ai/chat/prompts.service';

describe('getSystemPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['aws-cli.txt', '@openops/block-aws', 'aws_cli', 'aws prompt content'],
    [
      'gcp-cli.txt',
      '@openops/block-google-cloud',
      'google_cloud_cli',
      'gcp prompt content',
    ],
    [
      'azure-cli.txt',
      '@openops/block-azure',
      'azure_cli',
      'azure prompt content',
    ],
  ])(
    'should load cli block prompt from cloud',
    async (
      fileName: string,
      blockName: string,
      actionName: string,
      promptContent: string,
    ) => {
      getMock.mockReturnValue('https://example.com/prompts/');
      mockFetch.mockResolvedValueOnce(mockResponse(promptContent));

      const result = await getBlockSystemPrompt({
        blockName,
        workflowId: 'workflowId',
        stepId: 'stepId',
        actionName,
      });

      expect(result).toBe(promptContent);
      expect(readFileMock).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        `https://example.com/prompts/${fileName}`,
      );
    },
  );

  it.each([
    ['aws-cli.txt', '@openops/block-aws', 'aws_cli', 'aws prompt content', ''],
    [
      'azure-cli.txt',
      '@openops/block-azure',
      'azure_cli',
      'azure prompt content',
      '',
    ],
    [
      'gcp-cli.txt',
      '@openops/block-google-cloud',
      'google_cloud_cli',
      'gcp prompt content',
      '',
    ],
    [
      'aws-cli.txt',
      '@openops/block-aws',
      'aws_cli',
      'aws prompt content',
      undefined,
    ],
    [
      'azure-cli.txt',
      '@openops/block-azure',
      'azure_cli',
      'azure prompt content',
      undefined,
    ],
    [
      'gcp-cli.txt',
      '@openops/block-google-cloud',
      'google_cloud_cli',
      'gcp prompt content',
      undefined,
    ],
  ])(
    'should load cli block prompt from local file',
    async (
      fileName: string,
      blockName: string,
      actionName: string,
      promptContent: string,
      location: string | undefined,
    ) => {
      getMock.mockReturnValue(location);
      readFileMock.mockResolvedValueOnce(promptContent);

      const result = await getBlockSystemPrompt({
        blockName,
        workflowId: 'workflowId',
        stepId: 'stepId',
        actionName,
      });

      expect(result).toBe(promptContent);
      expect(fetch).not.toHaveBeenCalled();
      expect(readFileMock).toHaveBeenCalledWith(
        expect.stringContaining(fileName),
        'utf-8',
      );
    },
  );

  it('should return empty string for unknown block', async () => {
    const result = await getBlockSystemPrompt({
      blockName: 'some-other-block',
      workflowId: 'workflowId',
      stepId: 'stepId',
      actionName: 'some-other-action',
    });

    expect(result).toBe('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should fallback to read from local file', async () => {
    const promptContent = 'aws prompt content';
    getMock.mockReturnValue('https://example.com/prompts/');
    mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });
    readFileMock.mockResolvedValueOnce(promptContent);

    const result = await getBlockSystemPrompt({
      blockName: '@openops/block-aws',
      workflowId: 'workflowId',
      stepId: 'stepId',
      actionName: 'aws-cli',
    });

    expect(result).toBe(promptContent);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'gcp-cli.txt',
      '@openops/block-google-cloud',
      'google_cloud_cli',
      'gcp cli prompt content',
    ],
    [
      'gcp-big-query.txt',
      '@openops/block-google-cloud',
      'google_execute_sql_query',
      'gcp big query prompt content',
    ],
  ])(
    'should load action prompt from cloud',
    async (
      fileName: string,
      blockName: string,
      actionName: string,
      promptContent: string,
    ) => {
      getMock.mockReturnValue('https://example.com/prompts/');
      mockFetch.mockResolvedValueOnce(mockResponse(promptContent));

      const result = await getBlockSystemPrompt({
        blockName,
        workflowId: 'workflowId',
        stepId: 'stepId',
        actionName,
      });

      expect(result).toBe(promptContent);
      expect(readFileMock).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        `https://example.com/prompts/${fileName}`,
      );
    },
  );

  describe('code block tests', () => {
    const baseCodePrompt = 'Base code prompt content';

    beforeEach(() => {
      readFileMock.mockResolvedValue(baseCodePrompt);
    });

    it('should load code block prompt from cloud without enriched context', async () => {
      getMock.mockReturnValue('https://example.com/prompts/');
      mockFetch.mockResolvedValueOnce(mockResponse(baseCodePrompt));

      const result = await getBlockSystemPrompt({
        blockName: CODE_BLOCK_NAME,
        workflowId: 'workflowId',
        stepId: 'stepId',
        actionName: 'code_action',
      });

      expect(result).toBe(`${baseCodePrompt} `);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/prompts/code.txt',
      );
      expect(readFileMock).not.toHaveBeenCalled();
    });

    it('should load code block prompt from local file without enriched context', async () => {
      getMock.mockReturnValue('');

      const result = await getBlockSystemPrompt({
        blockName: CODE_BLOCK_NAME,
        workflowId: 'workflowId',
        stepId: 'stepId',
        actionName: 'code_action',
      });

      expect(result).toBe(`${baseCodePrompt} `);
      expect(fetch).not.toHaveBeenCalled();
      expect(readFileMock).toHaveBeenCalledWith(
        expect.stringContaining('code.txt'),
        'utf-8',
      );
    });

    it('should include variables when enriched context has steps with variables', async () => {
      getMock.mockReturnValue('');

      const enrichedContext = {
        flowId: 'test-flow-id',
        flowVersionId: 'test-flow-version-id',
        steps: [
          {
            id: 'step1',
            variables: [
              { name: 'var1', value: 'value1' },
              { name: 'var2', value: 'value2' },
            ],
          },
          {
            id: 'step2',
            variables: [{ name: 'var3', value: 'value3' }],
          },
        ],
      };

      const result = await getBlockSystemPrompt(
        {
          blockName: CODE_BLOCK_NAME,
          workflowId: 'workflowId',
          stepId: 'stepId',
          actionName: 'code_action',
        },
        enrichedContext,
      );

      const expectedVariables = `
        \n\n ## Inputs properties and sample values:\n${JSON.stringify([
          [{ 'inputs.var1': 'value1' }, { 'inputs.var2': 'value2' }],
          [{ 'inputs.var3': 'value3' }],
        ])}\n\n`;

      expect(result).toBe(`${baseCodePrompt} ${expectedVariables}`);
      expect(readFileMock).toHaveBeenCalledWith(
        expect.stringContaining('code.txt'),
        'utf-8',
      );
    });

    it('should not include variables when enriched context has steps without variables', async () => {
      getMock.mockReturnValue('');

      const enrichedContext = {
        flowId: 'test-flow-id',
        flowVersionId: 'test-flow-version-id',
        steps: [{ id: 'step1' }, { id: 'step2' }],
      };

      const result = await getBlockSystemPrompt(
        {
          blockName: CODE_BLOCK_NAME,
          workflowId: 'workflowId',
          stepId: 'stepId',
          actionName: 'code_action',
        },
        enrichedContext,
      );

      expect(result).toBe(`${baseCodePrompt} `);
      expect(readFileMock).toHaveBeenCalledWith(
        expect.stringContaining('code.txt'),
        'utf-8',
      );
    });

    it('should not include variables when enriched context has no steps', async () => {
      getMock.mockReturnValue('');

      const enrichedContext = {
        flowId: 'test-flow-id',
        flowVersionId: 'test-flow-version-id',
        steps: [],
      };

      const result = await getBlockSystemPrompt(
        {
          blockName: CODE_BLOCK_NAME,
          workflowId: 'workflowId',
          stepId: 'stepId',
          actionName: 'code_action',
        },
        enrichedContext,
      );

      expect(result).toBe(`${baseCodePrompt} `);
      expect(readFileMock).toHaveBeenCalledWith(
        expect.stringContaining('code.txt'),
        'utf-8',
      );
    });

    it('should handle mixed steps with and without variables', async () => {
      getMock.mockReturnValue('');

      const enrichedContext = {
        flowId: 'test-flow-id',
        flowVersionId: 'test-flow-version-id',
        steps: [
          {
            id: 'step1',
            variables: [{ name: 'var1', value: 'value1' }],
          },
          {
            id: 'step2',
          },
          {
            id: 'step3',
            variables: [{ name: 'var2', value: 'value2' }],
          },
        ],
      };

      const result = await getBlockSystemPrompt(
        {
          blockName: CODE_BLOCK_NAME,
          workflowId: 'workflowId',
          stepId: 'stepId',
          actionName: 'code_action',
        },
        enrichedContext,
      );

      const expectedVariables = `
        \n\n ## Inputs properties and sample values:\n${JSON.stringify([
          [{ 'inputs.var1': 'value1' }],
          null,
          [{ 'inputs.var2': 'value2' }],
        ])}\n\n`;

      expect(result).toBe(`${baseCodePrompt} ${expectedVariables}`);
    });

    it('should fallback to local file when cloud fetch fails for code block', async () => {
      getMock.mockReturnValue('https://example.com/prompts/');
      mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });

      const result = await getBlockSystemPrompt({
        blockName: CODE_BLOCK_NAME,
        workflowId: 'workflowId',
        stepId: 'stepId',
        actionName: 'code_action',
      });

      expect(result).toBe(`${baseCodePrompt} `);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/prompts/code.txt',
      );
      expect(readFileMock).toHaveBeenCalledWith(
        expect.stringContaining('code.txt'),
        'utf-8',
      );
    });
  });
});

function mockResponse(body: string, ok = true, statusText = 'OK'): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText,
    text: () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: () => new Response(),
    body: null,
    bodyUsed: false,
  } as unknown as Response;
}

describe('buildUIContextSection', () => {
  const TEST_IDS = {
    flowId: 'test-flow-123',
    flowVersionId: 'version-456',
    runId: 'run-789',
    currentStepId: 'step-abc',
  };

  const EXPECTED_STRINGS = {
    header: '## Current selected data: \n',
    footer: '. \n\n',
    helpText:
      'If the user is asking about anything related to this data, always use it query tools like Get latest flow version by id or run details tool in order to help him.',
  };

  const buildExpectedResult = (contextParts: string): string => {
    return (
      EXPECTED_STRINGS.header +
      contextParts +
      EXPECTED_STRINGS.footer +
      EXPECTED_STRINGS.helpText
    );
  };

  const createBaseContext = (
    overrides: Partial<ChatFlowContext> = {},
  ): ChatFlowContext => ({
    flowId: '',
    flowVersionId: '',
    steps: [],
    ...overrides,
  });

  describe('returns null when no valid context provided', () => {
    it.each([
      ['all required fields are missing', {}],
      [
        'all required fields are undefined',
        {
          flowId: undefined,
          flowVersionId: undefined,
          runId: undefined,
        },
      ],
      [
        'all required fields are empty strings',
        {
          flowId: '',
          flowVersionId: '',
          runId: '',
        },
      ],
    ])(
      'should return null when %s',
      async (_description: string, flowContext: Partial<ChatFlowContext>) => {
        const result = await buildUIContextSection(
          flowContext as ChatFlowContext,
        );
        expect(result).toBe('');
      },
    );
  });

  describe('builds context section with single field', () => {
    it.each([
      ['flowId', { flowId: TEST_IDS.flowId }, `flow ${TEST_IDS.flowId}`],
      [
        'flowVersionId',
        { flowVersionId: TEST_IDS.flowVersionId },
        `flowVersion ${TEST_IDS.flowVersionId}`,
      ],
      ['runId', { runId: TEST_IDS.runId }, `run ${TEST_IDS.runId}`],
    ])(
      'should build context with only %s',
      async (
        _fieldName: string,
        contextOverrides: Partial<ChatFlowContext>,
        expectedContextPart: string,
      ) => {
        const flowContext = createBaseContext(contextOverrides);
        const result = await buildUIContextSection(flowContext);
        expect(result).toBe(buildExpectedResult(expectedContextPart));
      },
    );
  });

  describe('builds context section with multiple fields', () => {
    it.each([
      [
        'flowId and flowVersionId',
        { flowId: TEST_IDS.flowId, flowVersionId: TEST_IDS.flowVersionId },
        `flow ${TEST_IDS.flowId} with flowVersion ${TEST_IDS.flowVersionId}`,
      ],
      [
        'all basic fields',
        {
          flowId: TEST_IDS.flowId,
          flowVersionId: TEST_IDS.flowVersionId,
          runId: TEST_IDS.runId,
        },
        `flow ${TEST_IDS.flowId} with flowVersion ${TEST_IDS.flowVersionId} with run ${TEST_IDS.runId}`,
      ],
      [
        'basic fields with currentStepId',
        {
          flowId: TEST_IDS.flowId,
          flowVersionId: TEST_IDS.flowVersionId,
          currentStepId: TEST_IDS.currentStepId,
        },
        `flow ${TEST_IDS.flowId} with flowVersion ${TEST_IDS.flowVersionId} with step id ${TEST_IDS.currentStepId}`,
      ],
    ])(
      'should build context with %s',
      async (
        _description: string,
        contextOverrides: Partial<ChatFlowContext>,
        expectedContextPart: string,
      ) => {
        const flowContext = createBaseContext(contextOverrides);
        const result = await buildUIContextSection(flowContext);
        expect(result).toBe(buildExpectedResult(expectedContextPart));
      },
    );
  });

  describe('handles edge cases', () => {
    it.each([
      [
        'mixed empty and valid context fields (step name ignored)',
        {
          flowId: TEST_IDS.flowId,
          flowVersionId: '',
          runId: TEST_IDS.runId,
          currentStepId: '',
        },
        // step name is ignored; empty flowVersion/currentStepId removed
        `flow ${TEST_IDS.flowId} with run ${TEST_IDS.runId}`,
      ],
      [
        'undefined optional fields gracefully',
        {
          flowId: TEST_IDS.flowId,
          flowVersionId: TEST_IDS.flowVersionId,
          runId: undefined,
          currentStepId: undefined,
        },
        `flow ${TEST_IDS.flowId} with flowVersion ${TEST_IDS.flowVersionId}`,
      ],
      [
        'steps array (does not affect context building)',
        {
          flowId: TEST_IDS.flowId,
          flowVersionId: TEST_IDS.flowVersionId,
          steps: [
            {
              id: 'step1',
              variables: [{ name: 'var1', value: 'value1' }],
            },
            {
              id: 'step2',
            },
          ],
        },
        `flow ${TEST_IDS.flowId} with flowVersion ${TEST_IDS.flowVersionId}`,
      ],
      [
        'currentStepData field (does not affect context building)',
        {
          flowId: TEST_IDS.flowId,
          flowVersionId: TEST_IDS.flowVersionId,
          currentStepData: { result: 'some data', status: 'success' },
        },
        `flow ${TEST_IDS.flowId} with flowVersion ${TEST_IDS.flowVersionId}`,
      ],
    ])(
      'should handle %s',
      async (
        _description: string,
        contextOverrides: Partial<ChatFlowContext>,
        expectedContextPart: string,
      ) => {
        const flowContext = createBaseContext(contextOverrides);
        const result = await buildUIContextSection(flowContext);
        expect(result).toBe(buildExpectedResult(expectedContextPart));
      },
    );
  });
});
