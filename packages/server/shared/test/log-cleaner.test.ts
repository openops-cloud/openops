import { ApplicationError, ErrorCode } from '@openops/shared';
import { cleanLogEvent, maxFieldLength } from '../src/lib/logger/log-cleaner';

// It's over 9000
export const excessiveFieldLength = maxFieldLength + 9000;

describe('log-cleaner', () => {
  it('should map response object', () => {
    const logEvent = {
      event: {
        res: {
          raw: {
            req: {
              method: 'GET',
              url: '/test',
            },
            statusCode: 200,
          },
        },
        responseTime: 123,
      },
    };

    const result = cleanLogEvent(logEvent);

    expect(result).toEqual({
      event: {
        requestMethod: 'GET',
        requestPath: '/test',
        statusCode: 200,
        responseTime: 123,
      },
      message: 'Request completed [GET /test 200 123ms]',
      level: 'debug',
    });
  });

  it('should stringify object values', () => {
    const logEvent = {
      event: {
        obj: {
          key: 'value',
        },
      },
    };

    const result = cleanLogEvent(logEvent);

    expect(result).toEqual({
      event: {
        obj: '{"key":"value"}',
      },
    });
  });

  it('should truncate long stringified values', () => {
    const logEvent = {
      event: {
        obj: {
          key: 'a'.repeat(excessiveFieldLength),
        },
      },
    };

    const result = cleanLogEvent(logEvent);

    expect(result).toEqual({
      event: {
        obj: '{"key":"' + 'a'.repeat(maxFieldLength - 11) + '...',
      },
    });
  });

  it('should ignore null or undefined values', () => {
    const logEvent = {
      event: {
        obj: null,
        key: undefined,
      },
    };

    const result = cleanLogEvent(logEvent);

    expect(result).toEqual({
      event: {},
    });
  });

  it('should truncate long messages', () => {
    const logEvent = {
      message: 'a'.repeat(excessiveFieldLength),
    };

    const result = cleanLogEvent(logEvent);

    expect(result).toEqual({
      message: 'a'.repeat(maxFieldLength - 3) + '...',
    });
  });

  it("should truncate long messages when there's event data", () => {
    const logEvent = {
      message: 'a'.repeat(excessiveFieldLength),
      event: {
        key: 'value',
      },
    };

    const result = cleanLogEvent(logEvent);

    expect(result).toEqual({
      message: 'a'.repeat(maxFieldLength - 3) + '...',
      event: {
        key: 'value',
      },
    });
  });

  it('Should handle errors when stringifying objects', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const circularObject: any = { key: 'value' };
    circularObject.circular = circularObject;

    const logEvent = {
      event: { circularObject },
    };

    const result = cleanLogEvent(logEvent);

    expect(result).toEqual({
      event: {
        circularObject:
          'Logger error - could not stringify object. TypeError: Converting circular structure to JSON\n' +
          "    --> starting at object with constructor 'Object'\n" +
          "    --- property 'circular' closes the circle",
      },
    });
  });

  describe('error objects', () => {
    it('should map error object', () => {
      const error = new Error('test error');
      Object.assign(error, {
        testContext: 'testContext',
      });
      const logEvent = {
        event: error,
      };

      const result = cleanLogEvent(logEvent);

      expect(result).toEqual({
        event: {
          errorStack: expect.stringMatching(/^Error: test error\s+at Object/),
          errorName: 'Error',
          errorContext: '{"testContext":"testContext"}',
          errorMessage: 'test error',
        },
        message: 'test error',
      });
    });

    it('should handle error object when logEvent.message already exists', () => {
      const logEvent = {
        message: 'existing message',
        event: new Error('test error'),
      };

      const result = cleanLogEvent(logEvent);

      expect(result).toEqual({
        message: 'existing message',
        event: {
          errorStack: expect.stringMatching(/^Error: test error\s+at Object/),
          errorName: 'Error',
          errorMessage: 'test error',
        },
      });
    });

    it('should truncate long error stack traces', () => {
      const longError = new Error('test error');
      // Create a very long stack trace
      longError.stack = 'Error: test error\n' + 'at test'.repeat(1000);

      const logEvent = {
        event: longError,
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.errorStack).toHaveLength(2048);
      expect(result.event.errorStack).toMatch(/\.\.\.$/);
      expect(result.event.errorName).toBe('Error');
      expect(result.message).toBe('test error');
    });

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const logEvent = {
        event: new CustomError('custom error message'),
      };

      const result = cleanLogEvent(logEvent);

      expect(result).toEqual({
        event: {
          errorStack: expect.stringMatching(
            /^CustomError: custom error message\s+at Object/,
          ),
          errorName: 'CustomError',
          errorMessage: 'custom error message',
        },
        message: 'custom error message',
      });
    });

    it('should handle error with empty message', () => {
      const error = new Error();
      const logEvent = {
        event: error,
      };

      const result = cleanLogEvent(logEvent);

      expect(result).toEqual({
        event: {
          errorStack: expect.stringMatching(/^Error(?::.*)?\n\s+at /),
          errorName: 'Error',
        }
      });
    });

    it('should flatten error context', () => {
      const logEvent = {
        event: new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            message: 'No Flow',
            entityType: 'Flow',
            entityId: '123'
          }
        }),
      };
      const result = cleanLogEvent(logEvent);

      expect(result).toEqual({
        event: {
          errorStack: expect.stringMatching(/^Error(?::.*)?\n\s+at /),
          errorName: 'Error',
          errorMessage: 'ENTITY_NOT_FOUND',
          errorCode: 'ENTITY_NOT_FOUND',
          errorParams: '{"message":"No Flow","entityType":"Flow","entityId":"123"}'
        },
        message: 'ENTITY_NOT_FOUND'
      });
    });
  });
});
