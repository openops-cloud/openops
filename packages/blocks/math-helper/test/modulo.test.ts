import { modulo } from '../src/lib/actions/modulo';

describe('modulo tests', () => {
  test.each([
    [5, 2, 1],
    [10, 3, 1],
    [10, 10, 0],
    [0, 5, 0],
    [-5, 2, -1],
    [5, -2, 1],
    [0.3, 0.1, 0],
  ])(
    'returns the correct remainder when calculating %p modulo %p',
    async (first_number, second_number, expectedResult) => {
      const result = await modulo.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number,
          second_number,
        },
      });
      expect(result).toBe(expectedResult);
    },
  );

  test('returns NaN when dividing by zero', async () => {
    const result = await modulo.run({
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        first_number: 5,
        second_number: 0,
      },
    });
    expect(result).toBeNaN();
  });

  test('throws error if first_number is not a number', async () => {
    await expect(
      modulo.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number: 'not_a_number' as any,
          second_number: 1,
        },
      }),
    ).rejects.toThrow('[DecimalError] Invalid argument: not_a_number');
  });

  test('throws error if second_number is not a number', async () => {
    await expect(
      modulo.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number: 1,
          second_number: 'not_a_number' as any,
        },
      }),
    ).rejects.toThrow('[DecimalError] Invalid argument: not_a_number');
  });
});
