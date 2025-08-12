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

import { CODE_BLOCK_NAME } from '@openops/shared';
import { getBlockSystemPrompt } from '../../../src/app/ai/chat/prompts.service';

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
            stepName: 'step1',
            variables: [
              { name: 'var1', value: 'value1' },
              { name: 'var2', value: 'value2' },
            ],
          },
          {
            id: 'step2',
            stepName: 'step2',
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
        steps: [
          { id: 'step1', stepName: 'step1' },
          { id: 'step2', stepName: 'step2' },
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
            stepName: 'step1',
            variables: [{ name: 'var1', value: 'value1' }],
          },
          {
            id: 'step2',
            stepName: 'step2',
          },
          {
            id: 'step3',
            stepName: 'step3',
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
