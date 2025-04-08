import { division } from '../src/lib/actions/division';

describe('division tests', () => {
  test.each([
    [2, 1, 2],
    [0, 5, 0],
    [3, -1, -3],
    [3.1, 1.2, 3.1 / 1.2],
    [0.02, 0.1, 0.2],
  ])(
    'returns the correct quotient when dividing %p by %p',
    async (first_number, second_number, expectedResult) => {
      const result = await division.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number,
          second_number,
        },
      });
      expect(result).toBe(expectedResult);
    },
  );

  test('returns Infinity when dividing by zero', async () => {
    const result = await division.run({
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        first_number: 1,
        second_number: 0,
      },
    });
    expect(result).toBe(Infinity);
  });

  test('throws error if first_number is not a number', async () => {
    await expect(
      division.run({
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
      division.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          first_number: 1,
          second_number: 'not_a_number' as any,
        },
      }),
    ).rejects.toThrow('[DecimalError] Invalid argument: not_a_number');
  });
});
