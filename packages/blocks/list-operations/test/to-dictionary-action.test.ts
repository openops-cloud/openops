import { BlockAuth } from '@openops/blocks-framework';
import { toMapAction } from '../src/lib/actions/to-dictionary-action';

describe('toMapAction', () => {
  test('should create action with properties', () => {
    expect(toMapAction.props).toMatchObject({
      listItems: {
        type: 'LONG_TEXT',
        required: true,
      },
      keyName: {
        required: true,
        type: 'SHORT_TEXT',
      },
    });
  });

  test.each([
    [
      {
        input: [
          { owner: 1, department: 'value1' },
          { owner: 'owner2', department: 'value2' },
          { owner: 1, department: 'value3' },
        ],
        output: {
          value1: [{ owner: 1, department: 'value1' }],
          value2: [{ owner: 'owner2', department: 'value2' }],
          value3: [{ owner: 1, department: 'value3' }],
        },
      },
    ],
    [
      {
        input: [
          { owner: 'owner1', department: 'value1' },
          { owner: 'owner2', department: 'value2' },
          { owner: 'owner3', department: 'value2' },
        ],
        output: {
          value1: [{ owner: 'owner1', department: 'value1' }],
          value2: [
            { owner: 'owner2', department: 'value2' },
            { owner: 'owner3', department: 'value2' },
          ],
        },
      },
    ],
  ])('should build dictionary based on given key', async (testCase: any) => {
    const { input, output } = testCase;
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: input,
        keyName: 'department',
      },
    };

    const result = (await toMapAction.run(context)) as any;
    expect(result).toEqual(output);
  });

  test.each([[null], [undefined], [{}], ['']])(
    'should return empty object if items are empty %p',
    async (items) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: BlockAuth.None(),
        propsValue: {
          listItems: items,
          keyName: 'key',
        },
      };

      const result = (await toMapAction.run(context)) as any;
      expect(result).toEqual({});
    },
  );

  test('should return empty object if items is an empty array', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: [],
        keyName: 'key',
      },
    };

    const result = (await toMapAction.run(context)) as any;
    expect(result).toEqual({});
  });

  test('should throw error if items are not an object array', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: ['not an array'],
        keyName: 'key',
      },
    };

    await expect(toMapAction.run(context)).rejects.toThrow(
      `'Items' must be an array of objects`,
    );
  });

  test('should not contains entry if key does not exist on some items', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: [
          { owner: 'owner1', email: 'value1' },
          { name: 'owner2', email: 'value2' },
          { name: 'owner3', email: 'value3' },
        ],
        keyName: 'owner',
      },
    };

    const result = (await toMapAction.run(context)) as any;
    expect(result).toEqual({ owner1: [{ owner: 'owner1', email: 'value1' }] });
  });
});
