const systemMock = {
  get: jest.fn(),
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
  authenticateDefaultUserInOpenOpsTables: jest.fn(),
  getTableIdByTableName: jest.fn().mockReturnValue(1),
  getTableIdByTableNameFromContext: jest.fn(),
  getDatabaseIdForBlock: jest.fn(),
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

    systemMock.get.mockReturnValue('https://some-url');
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
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'mock-token',
      refresh_token: 'mock-refresh-token',
    });
    openopsCommonMock.getTableIdByTableNameFromContext.mockResolvedValue(123);
    openopsCommonMock.getDatabaseIdForBlock.mockReturnValue(1);
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

    expect(
      openopsCommonMock.getTableIdByTableNameFromContext,
    ).toHaveBeenCalledTimes(1);
    expect(
      openopsCommonMock.getTableIdByTableNameFromContext,
    ).toHaveBeenCalledWith('my table', context);
    expect(openopsCommonMock.getDatabaseIdForBlock).toHaveBeenCalledTimes(1);
    expect(systemMock.getOrThrow).toHaveBeenCalledTimes(1);
    expect(systemMock.getOrThrow).toHaveBeenCalledWith('FRONTEND_URL');
  });
});
