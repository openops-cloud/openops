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
        circularObject: '{"key":"value","circular":"[Circular]"}',
      },
    });
  });

  describe('sensitive data redaction', () => {
    const originalEnv = process.env['OPS_REDACT_LOGS'];

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env['OPS_REDACT_LOGS'];
      } else {
        process.env['OPS_REDACT_LOGS'] = originalEnv;
      }
    });

    it('should redact password field when redaction is enabled', () => {
      process.env['OPS_REDACT_LOGS'] = 'true';
      const logEvent = {
        event: {
          email: 'user@example.com',
          password: 'secret',
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.password).toBe('[REDACTED]');
      expect(result.event.email).toBe('user@example.com');
    });

    it('should NOT redact password field when redaction is disabled', () => {
      process.env['OPS_REDACT_LOGS'] = 'false';
      const logEvent = {
        event: {
          email: 'user@example.com',
          password: 'secret',
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.password).toBe('secret');
      expect(result.event.email).toBe('user@example.com');
    });

    it('should redact password field by default when variable is not set', () => {
      delete process.env['OPS_REDACT_LOGS'];
      const logEvent = {
        event: {
          email: 'user@example.com',
          password: 'secret',
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.password).toBe('[REDACTED]');
      expect(result.event.email).toBe('user@example.com');
    });

    it('should redact password field', () => {
      const logEvent = {
        event: {
          email: 'user@example.com',
          password: 'secret',
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.password).toBe('[REDACTED]');
      expect(result.event.email).toBe('user@example.com');
    });

    it('should redact authorization field in objects', () => {
      process.env['OPS_REDACT_LOGS'] = 'true';
      const logEvent = {
        event: {
          request: {
            method: 'POST',
            authorization: 'Bearer token',
          },
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.request).toContain('[REDACTED]');
      expect(result.event.request).not.toContain('Bearer token');
    });

    it('should redact password in stringified JSON', () => {
      process.env['OPS_REDACT_LOGS'] = 'true';
      const logEvent = {
        event: {
          body: '{"email":"user@example.com","password":"secret"}',
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.body).toContain('[REDACTED]');
      expect(result.event.body).not.toContain('secret');
    });

    it('should redact password in nested objects', () => {
      process.env['OPS_REDACT_LOGS'] = 'true';
      const logEvent = {
        event: {
          request: {
            email: 'user@example.com',
            password: 'secret',
          },
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.request).toContain('[REDACTED]');
      expect(result.event.request).not.toContain('secret');
    });

    it('should NOT redact token usage statistics when redaction is disabled', () => {
      process.env['OPS_REDACT_LOGS'] = 'false';
      const logEvent = {
        message: 'Total token usage for stream',
        event: {
          usage:
            '{"inputTokens":"1234","outputTokens":"5678","totalTokens":"6912","cachedInputTokens":"100"}',
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.usage).toContain('1234');
      expect(result.event.usage).toContain('5678');
      expect(result.event.usage).toContain('6912');
      expect(result.event.usage).toContain('100');
      expect(result.event.usage).not.toContain('[REDACTED]');
    });

    it('should redact token usage statistics when redaction is enabled', () => {
      process.env['OPS_REDACT_LOGS'] = 'true';
      const logEvent = {
        message: 'Total token usage for stream',
        event: {
          usage:
            '{"inputTokens":"1234","outputTokens":"5678","totalTokens":"6912","cachedInputTokens":"100"}',
        },
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.usage).toContain('[REDACTED]');
      expect(result.event.usage).not.toContain('1234');
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
        },
      });
    });

    it('should flatten error context', () => {
      const logEvent = {
        event: new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: {
            message: 'No Flow',
            entityType: 'Flow',
            entityId: '123',
          },
        }),
      };
      const result = cleanLogEvent(logEvent);

      expect(result).toEqual({
        event: {
          errorStack: expect.stringMatching(/^Error(?::.*)?\n\s+at /),
          errorName: 'Error',
          errorMessage: 'ENTITY_NOT_FOUND',
          errorCode: 'ENTITY_NOT_FOUND',
          errorParams:
            '{"message":"No Flow","entityType":"Flow","entityId":"123"}',
        },
        message: 'ENTITY_NOT_FOUND',
      });
    });

    it('should handle error context with circular reference', () => {
      const error = new Error('test error');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circularContext: any = { key: 'value' };
      circularContext.circular = circularContext;
      Object.assign(error, circularContext);

      const logEvent = {
        event: error,
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.errorContext).toBe(
        '{"key":"value","circular":{"key":"value","circular":"[Circular]"}}',
      );
    });

    it('should handle ApplicationError params with circular reference', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circularParams: any = {
        message: 'test',
        data: {},
      };
      circularParams.data.circular = circularParams;

      const appError = new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: circularParams,
      });

      const logEvent = {
        event: appError,
      };

      const result = cleanLogEvent(logEvent);

      expect(result.event.errorParams).toBe(
        '{"message":"test","data":{"circular":"[Circular]"}}',
      );
    });

    it('should flatten error in correct fields by prefix', () => {
      const logEvent = {
        event: {
          networkError: new Error("Can't connect"),
        },
        level: 'info',
        message: 'Completed with an error',
      };

      const result = cleanLogEvent(logEvent);

      expect(result).toEqual({
        event: {
          networkErrorStack: expect.stringMatching(/^Error(?::.*)?\n\s+at /),
          networkErrorName: 'Error',
          networkErrorMessage: "Can't connect",
        },
        level: 'info',
        message: 'Completed with an error',
      });
    });
  });
});
