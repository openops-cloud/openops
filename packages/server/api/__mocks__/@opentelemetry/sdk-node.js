module.exports = {
  NodeSDK: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    shutdown: jest.fn(),
  })),
};
