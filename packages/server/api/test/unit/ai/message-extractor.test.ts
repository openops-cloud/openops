/* eslint-disable @typescript-eslint/no-explicit-any */
import { extractMessage } from '../../../src/app/ai/chat/message-extractor';

describe('Extract message from object', () => {
  const defaultFallback = 'An unknown error occurred. Please start a new chat.';
  const circularObj = {
    property: 1,
    obj: {},
  };
  circularObj.obj = circularObj;

  test.each([
    [undefined, defaultFallback],
    [null, defaultFallback],
    ['', defaultFallback],
    [new Error('Boom'), 'Boom'],
    [{ message: 'Top level message' }, 'Top level message'],
    [{ data: { details: { message: 'Nested message' } } }, 'Nested message'],
    [
      { errors: [{ code: 1 }, { message: 'Array nested message' }] },
      'Array nested message',
    ],
    ['Something went wrong', 'Something went wrong'],
    ['     ', defaultFallback],
    [42 as any, defaultFallback],
    [null as any, defaultFallback],
    [undefined as any, defaultFallback],
    [true as any, defaultFallback],
    [Symbol('x') as any, defaultFallback],
    [circularObj, defaultFallback],
    [
      {
        message: { text: 'not-a-string' },
        deeper: { message: 'Deeper works' },
      } as any,
      'Deeper works',
    ],
    [{ message: { text: 'not-a-string' } } as any, defaultFallback],
  ])(
    'should return the expected error message for %p, expected: %p',
    (obj: unknown, expected: string) => {
      expect(extractMessage(obj)).toBe(expected);
    },
  );

  it('uses custom fallback when provided and no message can be extracted', () => {
    const custom = 'Custom fallback';
    expect(extractMessage(undefined, custom)).toBe(custom);
  });
});
