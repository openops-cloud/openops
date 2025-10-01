const openopsCommonMock = {
  tryParseJson: jest.fn(),
};

jest.mock('../../src/lib/json-utils', () => openopsCommonMock);

import { z } from 'zod';
import {
  addValidationIssue,
  schemaValidation,
} from '../../src/lib/validation/zod-schema-validation';

describe('Schema validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns success with validated data for object input', () => {
    const schema = z.object({ x: z.string() });
    const input = { x: 'a' };
    const result = schemaValidation(schema, input);
    expect(result).toStrictEqual({ success: true, data: { x: 'a' } });
  });

  test('parses string input using tryParseJson', () => {
    const schema = z.object({ x: z.string() });
    openopsCommonMock.tryParseJson.mockReturnValue({ x: 'b' });
    const result = schemaValidation(schema, '{"x":"ignored"}');
    expect(openopsCommonMock.tryParseJson).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({ success: true, data: { x: 'b' } });
  });

  test('throws aggregated error map with first message per path', () => {
    const schema = z
      .object({
        name: z
          .string()
          .refine(() => false, { message: 'first' })
          .refine(() => false, { message: 'second' }),
        nested: z.object({ age: z.number().int({ message: 'int' }) }),
      })
      .superRefine((_, ctx) => {
        ctx.addIssue({ code: 'custom', message: 'global' });
      });

    try {
      schemaValidation(schema, { name: 'x', nested: { age: 3.5 } });
      throw new Error('expected to throw');
    } catch (e: any) {
      const parsed = JSON.parse(e.message);
      expect(parsed.errors).toEqual(
        expect.objectContaining({
          name: 'first',
          'nested.age': 'int',
        }),
      );
      expect(parsed.errors.name).toBe('first');
    }
  });
});

describe('Add validation issue', () => {
  test('adds custom issue to given path', () => {
    const ctx = { addIssue: jest.fn() } as any;
    addValidationIssue(ctx, 'Display', 'Message');
    expect(ctx.addIssue).toHaveBeenCalledTimes(1);
    expect(ctx.addIssue).toHaveBeenCalledWith({
      message: 'Message',
      code: 'custom',
      path: ['Display'],
    });
  });
});
