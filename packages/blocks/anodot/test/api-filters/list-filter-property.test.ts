const propertyHelpers = {
  booleanProperty: jest.fn(),
};
jest.mock('../../src/lib/api-filters/property-helpers', () => propertyHelpers);

import { DynamicProperties } from '@openops/blocks-framework';
import { listFilterProperty } from '../../src/lib/api-filters/list-filter-property';

describe('listFilterProperty', () => {
  test('should return expected property', async () => {
    const result = listFilterProperty(
      'togglePropertyName',
      'a toggle display name',
      'propertyName',
      'a property display name',
      'a property description',
    );

    expect(result).toMatchObject({
      togglePropertyName: {
        displayName: 'a toggle display name',
        required: false,
        type: 'CHECKBOX',
      },
      propertyName: {
        displayName: 'a property display name',
        description: 'a property description',
        required: true,
        type: 'DYNAMIC',
      },
    });
  });

  test('should populate property if checkbox is true', async () => {
    propertyHelpers.booleanProperty.mockReturnValueOnce('boolean prop');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { creds: 'some creds' },
      propsValue: {},
    };

    const result = listFilterProperty(
      'togglePropertyName',
      'a toggle display name',
      'propertyName',
      'a property display name',
      'a property description',
    );
    const dynamicProperty = result['propertyName'] as DynamicProperties<false>;
    const properties = await dynamicProperty.props(
      { auth: 'some auth', togglePropertyName: true } as any,
      context,
    );

    expect(propertyHelpers.booleanProperty).toHaveBeenCalledTimes(1);
    expect(propertyHelpers.booleanProperty).toHaveBeenCalledWith(
      '(a property display name) Exclusion condition',
      'Determines whether to check inclusion or exclusion.',
      true,
      'false',
    );
    expect(properties['negate']).toBe('boolean prop');
    expect(properties['eq']).toMatchObject({
      displayName: '(a property display name) Values',
      required: true,
      type: 'ARRAY',
    });
  });
});
