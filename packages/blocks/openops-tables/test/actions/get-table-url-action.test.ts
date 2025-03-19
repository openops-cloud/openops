const systemMock = {
  getOrThrow: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  SharedSystemProp: {
    FRONTEND_URL: 'FRONTEND_URL',
  },
  system: systemMock,
}));

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  getTableIdByTableName: jest.fn().mockReturnValue(1),
  openopsTablesDropdownProperty: jest.fn().mockReturnValue({
    required: true,
    defaultValue: false,
    type: 'DROPDOWN',
  }),
};

jest.mock('@openops/common', () => openopsCommonMock);
import { getTableUrlAction } from '../../src/actions/get-table-url-action';

describe('getTableUrlAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    systemMock.getOrThrow.mockReturnValue('https://some-url');
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(getTableUrlAction.props).length).toBe(1);
    expect(getTableUrlAction.props).toMatchObject({
      tableName: {
        required: true,
        type: 'DROPDOWN',
      },
    });
  });

  test('should return proper URL', async () => {
    openopsCommonMock.getTableIdByTableName.mockReturnValue(123);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        tableName: 'my table',
      },
    };

    const result = (await getTableUrlAction.run(context)) as any;

    expect(result).toStrictEqual(
      'https://some-url/tables?path=/database/1/table/123',
    );

    expect(openopsCommonMock.getTableIdByTableName).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getTableIdByTableName).toHaveBeenCalledWith(
      'my table',
    );
    expect(systemMock.getOrThrow).toHaveBeenCalledTimes(1);
    expect(systemMock.getOrThrow).toHaveBeenCalledWith('FRONTEND_URL');
  });
});
