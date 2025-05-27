const mockFetch = jest.fn();
global.fetch = mockFetch;

const readFileMock = jest.fn();
jest.mock('fs/promises', () => ({
  readFile: readFileMock,
}));

const getMock = jest.fn();
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

import { getSystemPrompt } from '../../../src/app/ai/chat/prompts.service';

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

      const result = await getSystemPrompt({
        blockName,
        workflowId: 'workflowId',
        stepName: 'stepName',
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

      const result = await getSystemPrompt({
        blockName,
        workflowId: 'workflowId',
        stepName: 'stepName',
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
    const result = await getSystemPrompt({
      blockName: 'some-other-block',
      workflowId: 'workflowId',
      stepName: 'stepName',
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

    const result = await getSystemPrompt({
      blockName: '@openops/block-aws',
      workflowId: 'workflowId',
      stepName: 'stepName',
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

      const result = await getSystemPrompt({
        blockName,
        workflowId: 'workflowId',
        stepName: 'stepName',
        actionName,
      });

      expect(result).toBe(promptContent);
      expect(readFileMock).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        `https://example.com/prompts/${fileName}`,
      );
    },
  );
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
