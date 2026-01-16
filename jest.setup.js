// Mock langfuse-vercel to prevent dynamic import errors in Jest
jest.mock('langfuse-vercel', () => ({
  LangfuseExporter: jest.fn().mockImplementation(() => ({
    export: jest.fn(),
    shutdown: jest.fn(),
  })),
}));

jest.mock('bcrypt', () => ({
  hashSync: jest.fn().mockReturnValue('mocked-hash'),
  compareSync: jest.fn().mockReturnValue(true),
  hash: jest.fn().mockResolvedValue('mocked-hash'),
  compare: jest.fn().mockResolvedValue(true),
}));
