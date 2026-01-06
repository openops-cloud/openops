const openopsServerSharedMock = {
  ...jest.requireActual('@openops/server-shared'),
  encryptUtils: {
    decryptString: jest.fn().mockReturnValue('test_token'),
  },
};

jest.mock('@openops/server-shared', () => openopsServerSharedMock);

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesPost: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

import { AxiosHeaders } from 'axios';
import {
  createTable,
  Table,
} from '../../../src/app/openops-tables/create-table';
describe('createTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the created table on successful creation', async () => {
    const databaseId = 1;
    const tableName = 'Test Table';
    const tableColumns = [
      ['Column1', 'Column2'],
      ['Data1', 'Data2'],
    ];
    const mockTable: Table = {
      id: 1,
      name: 'Test Table',
      order: 1,
      database_id: databaseId,
    };

    const context = {
      tablesDatabaseToken: {
        iv: 'iv',
        data: 'test_token_encrypted_with_iv',
      },
      tablesDatabaseId: databaseId,
    };
    openopsCommonMock.makeOpenOpsTablesPost.mockResolvedValue(mockTable);

    const result = await createTable(context, tableName, tableColumns);

    expect(result).toEqual(mockTable);
    expect(openopsCommonMock.makeOpenOpsTablesPost).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      { name: tableName, data: tableColumns, first_row_header: true },
      new AxiosHeaders({
        'Content-Type': 'application/json',
        Authorization: `Token test_token`,
      }),
    );
  });
});
