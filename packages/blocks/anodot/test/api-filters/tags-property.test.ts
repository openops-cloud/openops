const propertyHelpers = {
  booleanProperty: jest.fn(),
  operatorProperty: jest.fn(),
};
jest.mock('../../src/lib/api-filters/property-helpers', () => propertyHelpers);

import { DynamicProperties } from '@openops/blocks-framework';
import { tagsProperty } from '../../src/lib/api-filters/tags-property';
describe('tagsProperty', () => {
  test('should return expected property', async () => {
    const result = tagsProperty(
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
    propertyHelpers.operatorProperty.mockReturnValueOnce('operator prop');

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { creds: 'some creds' },
      propsValue: {},
    };

    const result = tagsProperty(
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
      '(propertyName) Negate condition',
      '',
      false,
      'false',
    );
    expect(properties['negate']).toBe('boolean prop');
    expect(properties['tag']).toMatchObject({
      displayName: '(propertyName) Tag',
      required: true,
      type: 'LONG_TEXT',
    });
    expect(properties['eq']).toMatchObject({
      displayName: '(propertyName) Equal values',
      required: false,
      type: 'ARRAY',
    });
    expect(properties['like']).toMatchObject({
      displayName: '(propertyName) Like values',
      required: false,
      type: 'ARRAY',
    });
    expect(propertyHelpers.operatorProperty).toHaveBeenCalledTimes(1);
    expect(propertyHelpers.operatorProperty).toHaveBeenCalledWith(
      '(propertyName) Operator',
      '',
    );
    expect(properties['operator']).toBe('operator prop');
  });
});
