import { BlockAuth } from '@openops/blocks-framework';
import { groupByAction } from '../src/lib/actions/group-by-action';

describe('groupByAction', () => {
  test('should create action with properties', () => {
    expect(groupByAction.props).toMatchObject({
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

  test('should groups based on given key', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: [
          { owner: 1, department: 'value1' },
          { owner: 'owner2', department: 'value2' },
          { owner: 1, department: 'value3' },
        ],
        keyName: 'owner',
      },
    };

    const result = (await groupByAction.run(context)) as any;
    expect(result).toEqual([
      [
        { owner: 1, department: 'value1' },
        { owner: 1, department: 'value3' },
      ],
      [{ owner: 'owner2', department: 'value2' }],
    ]);
  });

  test('should return empty if resources are empty', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: [],
        keyName: 'key',
      },
    };

    const result = (await groupByAction.run(context)) as any;
    expect(result).toEqual([]);
  });

  test('should return empty if key does not match any', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: [
          { owner: 1, email: 'value1' },
          { owner: 'owner2', email: 'value2' },
        ],
        keyName: 'nonExistentKey',
      },
    };

    const result = (await groupByAction.run(context)) as any;
    expect(result).toEqual([]);
  });

  test('should return only objects where key is present', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: [{ owner: 'owner1', email: 'value1' }, { email: 'value2' }],
        keyName: 'owner',
      },
    };

    const result = (await groupByAction.run(context)) as any;
    expect(result).toEqual([[{ owner: 'owner1', email: 'value1' }]]);
  });

  test('should throw error if resources is not array', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: BlockAuth.None(),
      propsValue: {
        listItems: 'not an array',
        keyName: 'key',
      },
    };

    await expect(groupByAction.run(context)).rejects.toThrow(
      `Invalid JSON string provided for 'Items'`,
    );
  });
});
