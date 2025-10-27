import { virtualTagsProperty } from '../../src/lib/api-filters/virtual-tags-property';

describe('virtualTagsProperty', () => {
  test('should return expected property', async () => {
    const result = virtualTagsProperty();

    expect(result).toMatchObject({
      useVirtualTag: {
        required: false,
        type: 'CHECKBOX',
      },
      virtualTag: {
        required: true,
        type: 'DYNAMIC',
      },
    });
  });

  test('should populate property if checkbox is true', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { creds: 'some creds' },
      propsValue: {},
    };

    const result = virtualTagsProperty();
    const properties = await result['virtualTag'].props(
      { auth: 'some auth', useVirtualTag: true } as any,
      context,
    );

    expect(properties['uuid']).toMatchObject({
      required: true,
      type: 'LONG_TEXT',
    });
    expect(properties['eq']).toMatchObject({
      required: false,
      type: 'ARRAY',
    });
    expect(properties['like']).toMatchObject({
      required: false,
      type: 'ARRAY',
    });
  });
});
