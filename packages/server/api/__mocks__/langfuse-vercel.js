module.exports = {
  LangfuseExporter: jest.fn().mockImplementation(() => ({
    export: jest.fn(),
    shutdown: jest.fn(),
  })),
};
