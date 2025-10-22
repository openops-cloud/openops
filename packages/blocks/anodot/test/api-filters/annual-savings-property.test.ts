import { annualSavingsProperty } from '../../src/lib/api-filters/annual-savings-property';

describe('annualSavingsProperty', () => {
  test('should return expected properties', async () => {
    const result = annualSavingsProperty();

    expect(result).toMatchObject({
      useAnnualSavings: {
        required: false,
        type: 'CHECKBOX',
      },
      annualSavingsProperty: {
        required: true,
        type: 'DYNAMIC',
      },
    });
  });

  test('should populate annualSavingsProperty if checkbox is true', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { creds: 'some creds' },
      propsValue: {},
    };

    const result = annualSavingsProperty();
    const savingsProperty = await result['annualSavingsProperty'].props(
      { auth: 'some auth', useAnnualSavings: true } as any,
      context,
    );

    expect(savingsProperty['annualSavingsMin']).toMatchObject({
      displayName: 'Annual savings greater than',
      type: 'NUMBER',
      valueSchema: undefined,
      required: true,
    });
  });
});
