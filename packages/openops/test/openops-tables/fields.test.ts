const makeOpenOpsTablesGetMock = jest.fn();
const createAxiosHeadersMock = jest.fn();
jest.mock('../../src/lib/openops-tables/requests-helpers', () => ({
  makeOpenOpsTablesGet: makeOpenOpsTablesGetMock,
  createAxiosHeaders: createAxiosHeadersMock,
}));

import {
  OpenOpsField,
  getFields,
  getPrimaryKeyFieldFromFields,
} from '../../src/lib/openops-tables/fields';

describe('getFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should get fields', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      [
        {
          id: 1,
          name: 'field name',
          type: 'field type',
          primary: true,
          description: 'field description',
          read_only: false,
        },
      ],
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await getFields(1, 'token')) as unknown as OpenOpsField[];

    expect(result[0]).toStrictEqual({
      id: 1,
      name: 'field name',
      type: 'field type',
      primary: true,
      description: 'field description',
      read_only: false,
    });
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/fields/table/1/?user_field_names=true',
      'some header',
      undefined,
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('Should flatten list', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      [
        {
          id: 1,
          name: 'field name',
          type: 'field type',
          primary: true,
          description: 'field description',
          read_only: false,
        },
      ],
      [
        {
          id: 2,
          name: 'field name2',
          type: 'field type2',
          primary: true,
          description: 'field description2',
          read_only: false,
        },
      ],
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await getFields(1, 'token')) as unknown as OpenOpsField[];

    expect(result).toStrictEqual([
      {
        id: 1,
        name: 'field name',
        type: 'field type',
        primary: true,
        description: 'field description',
        read_only: false,
      },
      {
        id: 2,
        name: 'field name2',
        type: 'field type2',
        primary: true,
        description: 'field description2',
        read_only: false,
      },
    ]);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/fields/table/1/?user_field_names=true',
      'some header',
      undefined,
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});

describe('getPrimaryKeyFieldFromFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should getPrimaryKeyFieldFromFields', async () => {
    const result = (await getPrimaryKeyFieldFromFields([
      {
        id: 1,
        primary: true,
        name: 'one',
        type: 'string',
        read_only: true,
        description: '',
      },
      {
        id: 2,
        primary: false,
        name: 'two',
        type: 'string',
        read_only: false,
        description: '',
      },
    ])) as unknown as OpenOpsField[];

    expect(result).toStrictEqual({
      id: 1,
      primary: true,
      name: 'one',
      type: 'string',
      read_only: true,
      description: '',
    });
  });

  test('Should throw if no primary field was found', () => {
    const fields = [
      {
        id: 1,
        primary: false,
        name: 'one',
        type: 'string',
        read_only: true,
        description: '',
      },
      {
        id: 2,
        primary: false,
        name: 'two',
        type: 'string',
        read_only: false,
        description: '',
      },
    ];

    expect(() => {
      getPrimaryKeyFieldFromFields(fields);
    }).toThrowError('Primary key field not found');
  });
});
