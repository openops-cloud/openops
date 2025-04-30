const mockFetch = jest.fn();
global.fetch = mockFetch;

const getOrThrowMock = jest.fn();
jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
  },
  system: {
    getOrThrow: getOrThrowMock,
  },
  AppSystemProp: {
    INTERNAL_PROMPTS_LOCATION: 'INTERNAL_PROMPTS_LOCATION',
  },
}));

import { getSystemPrompt } from '../../../src/app/ai/chat/prompts.service';

describe('getSystemPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load aws cli block prompt', async () => {
    getOrThrowMock.mockReturnValue('https://example.com/prompts/');
    mockFetch.mockResolvedValueOnce(mockResponse('aws prompt content'));

    const result = await getSystemPrompt({
      blockName: '@openops/block-aws',
      workflowId: 'workflowId',
      stepName: 'stepName',
    });

    expect(result).toBe('aws prompt content');
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/prompts/aws-cli.txt',
    );
  });

  it('should load azure cli block prompt', async () => {
    getOrThrowMock.mockReturnValue('https://example.com/prompts/');
    mockFetch.mockResolvedValueOnce(mockResponse('azure prompt content'));

    const result = await getSystemPrompt({
      blockName: '@openops/block-azure',
      workflowId: 'workflowId',
      stepName: 'stepName',
    });
    expect(result).toBe('azure prompt content');
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/prompts/azure-cli.txt',
    );
  });

  it('should load gcp cli block prompt', async () => {
    getOrThrowMock.mockReturnValue('https://example.com/prompts/');
    mockFetch.mockResolvedValueOnce(mockResponse('gcp prompt content'));

    const result = await getSystemPrompt({
      blockName: '@openops/block-google-cloud',
      workflowId: 'workflowId',
      stepName: 'stepName',
    });
    expect(result).toBe('gcp prompt content');
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/prompts/gcp-cli.txt',
    );
  });

  it('should return empty string for unknown block', async () => {
    const result = await getSystemPrompt({
      blockName: 'some-other-block',
      workflowId: 'workflowId',
      stepName: 'stepName',
    });
    expect(result).toBe('');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle failed fetch gracefully', async () => {
    getOrThrowMock.mockReturnValue('https://example.com/prompts/');
    mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });

    const result = await getSystemPrompt({
      blockName: '@openops/block-aws',
      workflowId: 'workflowId',
      stepName: 'stepName',
    });

    expect(result).toBe('');
    expect(fetch).toHaveBeenCalled();
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
