// Mock langfuse-vercel to prevent dynamic import errors in Jest
jest.mock('langfuse-vercel', () => ({
  LangfuseExporter: jest.fn().mockImplementation(() => ({
    export: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

// Suppress console output in CI to reduce log noise
if (process.env.CI === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
