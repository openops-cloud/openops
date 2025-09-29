import { analyze } from '../src/lib/actions/analyze';

jest.mock('ai', () => ({
  generateText: jest.fn(async ({ prompt }) => ({ text: `ECHO: ${prompt}` })),
}));

jest.mock('@openops/common', () => ({
  getAiProviderLanguageModel: jest.fn(async () => ({})),
}));

describe('analyze action', () => {
  it('returns generated text for prompt only', async () => {
    const result = await analyze.run({
      auth: {
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        apiKey: 'key',
      },
      propsValue: {
        prompt: 'Hello?',
      },
      project: { id: 'pid' },
      flows: { current: { id: 'fid', version: { id: 'fvid' } } },
      server: { apiUrl: '', publicUrl: '', token: '' },
      files: { write: async () => '' },
      store: {
        put: async (k, v) => v,
        get: async () => null,
        delete: async () => {},
        list: async () => [],
      },
      tags: { add: async () => {} },
      connections: { get: async () => null },
      run: {
        id: 'rid',
        name: 'r',
        pauseId: '',
        stop: () => {},
        pause: () => {},
        isTest: true,
      },
      generateResumeUrl: () => '',
      serverUrl: '',
      executionType: 'BEGIN',
      currentExecutionPath: '',
    } as any);

    expect(result).toContain('ECHO: Hello?');
  });

  it('composes prompt with source when provided', async () => {
    const result = await analyze.run({
      auth: {
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        apiKey: 'key',
      },
      propsValue: {
        prompt: 'Why did the opportunity get rejected?',
        source: '- Price too high\n- Timing not right',
      },
      project: { id: 'pid' },
      flows: { current: { id: 'fid', version: { id: 'fvid' } } },
      server: { apiUrl: '', publicUrl: '', token: '' },
      files: { write: async () => '' },
      store: {
        put: async (k, v) => v,
        get: async () => null,
        delete: async () => {},
        list: async () => [],
      },
      tags: { add: async () => {} },
      connections: { get: async () => null },
      run: {
        id: 'rid',
        name: 'r',
        pauseId: '',
        stop: () => {},
        pause: () => {},
        isTest: true,
      },
      generateResumeUrl: () => '',
      serverUrl: '',
      executionType: 'BEGIN',
      currentExecutionPath: '',
    } as any);

    expect(result).toContain('Source:');
  });
});
