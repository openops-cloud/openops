const getContextMock = jest.fn();
const errorMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  getContext: getContextMock,
  logger: {
    error: errorMock,
  },
}));

import { throwIfExecutionTimeExceeded } from '../src/lib/timeout-validator';

describe('Throw if execution time exceeded', () => {
  const originalDateNow = Date.now;

  afterEach(() => {
    jest.clearAllMocks();
    global.Date.now = originalDateNow;
  });

  it('should do nothing if the deadlineTimestamp is not set', () => {
    getContextMock.mockReturnValue({});
    expect(() => throwIfExecutionTimeExceeded()).not.toThrow();
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('should do nothing if the current time is before deadlineTimestamp', () => {
    const futureTimestamp = Date.now() + 10000;
    getContextMock.mockReturnValue({ deadlineTimestamp: futureTimestamp.toString() });

    global.Date.now = jest.fn(() => futureTimestamp - 5000);

    expect(() => throwIfExecutionTimeExceeded()).not.toThrow();
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('should throw an error and log the error if current time exceeds deadlineTimestamp', () => {
    const pastTimestamp = Date.now() - 10000;
    getContextMock.mockReturnValue({ deadlineTimestamp: pastTimestamp.toString() });

    global.Date.now = jest.fn(() => pastTimestamp + 5000);

    expect(() => throwIfExecutionTimeExceeded()).toThrow('Engine execution time exceeded.');
    expect(errorMock).toHaveBeenCalledWith('Engine execution time exceeded.');
  });
});
