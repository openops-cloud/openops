import { multiplication } from '../src/lib/actions/multiplication';

describe('multiply tests', () => {
  test.each([
    [1, 2, 2],
    [0, 0, 0],
    [-1, 1, -1],
    [3.1, 1.2, 3.72],
    [0.1, 0.2, 0.02],
  ])(
    'returns the correct product when multiplying %p and %p',
    async (first_number, second_number, expectedResult) => {
      const result = await multiplication.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number,
          second_number,
        },
      });
      expect(result).toBe(expectedResult);
    },
  );

  test.skip('throws error if first_number is not a number', async () => {
    await expect(
      multiplication.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number: 'not_a_number' as any,
          second_number: 1,
        },
      }),
    ).rejects.toThrow('[DecimalError] Invalid argument: not_a_number');
  });

  test.skip('throws error if second_number is not a number', async () => {
    await expect(
      multiplication.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number: 1,
          second_number: 'not_a_number' as any,
        },
      }),
    ).rejects.toThrow('[DecimalError] Invalid argument: not_a_number');
  });
});
