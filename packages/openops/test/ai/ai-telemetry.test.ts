const mockLangfuseSpanProcessor = jest.fn();

jest.mock('@langfuse/otel', () => ({
  LangfuseSpanProcessor: mockLangfuseSpanProcessor,
}));

const mockNodeTracerProvider = jest.fn();

jest.mock('@opentelemetry/sdk-trace-node', () => ({
  NodeTracerProvider: mockNodeTracerProvider,
}));

const mockSystemProps: Record<string, string | undefined> = {
  LANGFUSE_SECRET_KEY: 'sk-lf-test',
  LANGFUSE_PUBLIC_KEY: 'pk-lf-test',
  LANGFUSE_HOST: 'https://us.cloud.langfuse.com',
  ENVIRONMENT_NAME: 'staging',
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  system: {
    get: jest.fn((prop: string) => mockSystemProps[prop]),
  },
}));

import { getAiTelemetrySDK } from '../../src/lib/ai/providers';

describe('getAiTelemetrySDK', () => {
  it('should configure the Langfuse span processor with credentials, host, release and environment', () => {
    const tracerProvider = getAiTelemetrySDK();

    expect(tracerProvider).toBe(mockNodeTracerProvider.mock.instances[0]);
    expect(mockLangfuseSpanProcessor).toHaveBeenCalledTimes(1);
    expect(mockLangfuseSpanProcessor).toHaveBeenCalledWith({
      secretKey: 'sk-lf-test',
      publicKey: 'pk-lf-test',
      baseUrl: 'https://us.cloud.langfuse.com',
      release: 'staging',
      environment: 'staging',
    });
    expect(mockNodeTracerProvider).toHaveBeenCalledWith({
      spanProcessors: [mockLangfuseSpanProcessor.mock.instances[0]],
    });
  });

  it('should reuse the tracer provider on subsequent calls', () => {
    const first = getAiTelemetrySDK();
    const second = getAiTelemetrySDK();

    expect(second).toBe(first);
    expect(mockLangfuseSpanProcessor).toHaveBeenCalledTimes(1);
  });
});
