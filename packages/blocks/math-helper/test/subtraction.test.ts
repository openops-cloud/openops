import { subtraction } from '../src/lib/actions/subtraction';

describe('subtraction tests', () => {
  test.each([
    [1, 2, 1],
    [0, 0, 0],
    [-1, 1, 2],
    [0.1, 0.3, 0.2],
  ])(
    'returns the correct result when subtracting %p from %p',
    async (first_number, second_number, expectedResult) => {
      const result = await subtraction.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number,
          second_number,
        },
      });
      expect(result).toBe(expectedResult);
    },
  );

  test('throws error if first_number is not a number', async () => {
    await expect(
      subtraction.run({
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
      subtraction.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number: 1,
          second_number: 'not_a_number' as any,
        },
      }),
    ).rejects.toThrow('[DecimalError] Invalid argument: not_a_number');
  });
});
