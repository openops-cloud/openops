import { addition } from '../src/lib/actions/addition';

describe('addition tests', () => {
  test.each([
    [1, 2, 3],
    [0, 0, 0],
    [-1, 1, 0],
    [3.1, 1.2, 4.3],
    [0.1, 0.2, 0.3],
  ])(
    'returns the correct sum when adding %p and %p',
    async (first_number, second_number, expectedResult) => {
      const result = await addition.run({
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
      addition.run({
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
      addition.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number: 1,
          second_number: 'not_a_number' as any,
        },
      }),
    ).rejects.toThrow('[DecimalError] Invalid argument: not_a_number');
  });
});
