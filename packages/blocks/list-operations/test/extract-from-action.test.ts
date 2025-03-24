import { extractFromListAction } from '../src/lib/actions/extract-from-action';

describe('extractFromListAction', () => {
  test('should create action with correct properties', () => {
    expect(extractFromListAction.props).toMatchObject({
      listItems: {
        type: 'LONG_TEXT',
        required: true,
      },
      keyName: {
        type: 'SHORT_TEXT',
        required: true,
      },
    });
  });

  test('should return extracted items', async () => {
    const listItems = [
      { id: 'id1', name: 'name1' },
      { id: 'id2', name: 'name2' },
      { id: 'id3', name: 'name3' },
      { id: 'id4', name: 'name4' },
    ];

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: undefined,
      propsValue: {
        listItems: listItems,
        keyName: 'name',
      },
    };

    const result = await extractFromListAction.run(context);
    expect(result).toEqual(['name1', 'name2', 'name3', 'name4']);
  });

  test('should throw if property is not in all listItems', async () => {
    const listItems = [
      { id: 'id1', name: 'name1', age: 20 },
      { id: 'id2', name: 'name2' },
      { id: 'id3', name: 'name3', age: 16 },
      { id: 'id4', name: 'name4' },
    ];

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: undefined,
      propsValue: {
        listItems: listItems,
        keyName: 'age',
      },
    };

    await expect(extractFromListAction.run(context)).rejects.toThrow(
      'Item does not have property: age',
    );
  });

  test('should return an error if resources is not an array', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        listItems: 'not an array',
        keyName: 'key',
      },
    };

    await expect(extractFromListAction.run(context)).rejects.toThrow(
      `Invalid JSON string provided for 'Items'`,
    );
  });
});
