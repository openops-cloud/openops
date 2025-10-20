// Mock langfuse-vercel to prevent dynamic import errors in Jest
jest.mock('langfuse-vercel', () => ({
  LangfuseExporter: jest.fn().mockImplementation(() => ({
    export: jest.fn(),
    shutdown: jest.fn(),
  })),
}));
