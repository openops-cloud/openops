const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  makeOpenOpsTablesPost: jest.fn(),
  makeOpenOpsTablesPatch: jest.fn(),
  getFields: jest.fn(),
  createAxiosHeaders: jest.fn(),
  getPrimaryKeyFieldFromFields: jest.fn(),
};
jest.mock('@openops/common', () => openopsCommonMock);

const createTableMock = jest.fn();
jest.mock('../../../src/app/openops-tables/create-table', () => {
  return { createTable: createTableMock };
});

import { createOpportunitiesTable } from '../../../src/app/openops-tables/template-tables/create-opportunities-table';

describe('createOpportunityTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully add new fields', async () => {
    createTableMock.mockResolvedValue({ id: 1 });
    openopsCommonMock.createAxiosHeaders.mockReturnValue('some header');
    openopsCommonMock.getFields.mockReturnValue(['a field']);
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({ id: 1 });
    openopsCommonMock.makeOpenOpsTablesPost.mockReturnValue({ id: 1 });

    await createOpportunitiesTable('some token', 2);

    expect(createTableMock).toHaveBeenCalledTimes(1);
    expect(createTableMock).toHaveBeenCalledWith(
      2,
      'Opportunities',
      [['ID']],
      'some token',
    );

    expect(openopsCommonMock.makeOpenOpsTablesPatch).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.makeOpenOpsTablesPatch).toHaveBeenCalledWith(
      'api/database/fields/1/',
      { name: 'ID', type: 'uuid' },
      'some header',
    );

    const expectedCalls = [
      {
        name: 'Status',
        type: 'single_select',
        select_options: [
          { value: 'Created', color: 'grey' },
          { value: 'Dismissed', color: 'darker-red' },
          { value: 'Snoozed', color: 'yellow' },
          { value: 'Approved', color: 'dark-green' },
          { value: 'Under review', color: 'pink' },
          { value: 'Completed', color: 'darker-blue' },
        ],
      },
      {
        name: 'Opportunity Type',
        type: 'single_select',
        select_options: [
          { value: 'Cost anomaly', color: 'darker-green' },
          { value: 'Workflow optimization', color: 'red' },
          { value: 'Rate optimization', color: 'darker-orange' },
        ],
      },
      {
        name: 'Estimated savings USD per month',
        type: 'number',
        number_decimal_places: 2,
      },
      { name: 'Resource ID', type: 'text' },
      { name: 'Workflow', type: 'text' },
      { name: 'Service', type: 'text' },
      { name: 'Region', type: 'text' },
      { name: 'Account', type: 'text' },
      { name: 'Owner', type: 'text' },
      { name: 'Follow-up task', type: 'text' },
      { name: 'Opportunity source', type: 'text' },
      { name: 'External Opportunity Id', type: 'text' },
      {
        name: 'Complexity',
        type: 'single_select',
        select_options: [
          { value: 'XS', color: 'darker-green' },
          { value: 'S', color: 'dark-cyan' },
          { value: 'M', color: 'grey' },
          { value: 'L', color: 'darker-orange' },
          { value: 'XL', color: 'darker-red' },
        ],
      },
      {
        name: 'Risk',
        type: 'single_select',
        select_options: [
          { value: 'Low', color: 'darker-green' },
          { value: 'Medium', color: 'yellow' },
          { value: 'High', color: 'darker-red' },
        ],
      },
      { name: 'Opportunity details', type: 'long_text' },
      {
        name: 'Snoozed until',
        type: 'date',
        date_format: 'ISO',
        date_include_time: true,
      },
      { name: 'Resolution notes', type: 'long_text' },
      {
        name: 'Creation time',
        type: 'created_on',
        date_format: 'ISO',
        date_include_time: true,
      },
      {
        name: 'Last modified time',
        type: 'last_modified',
        date_format: 'ISO',
        date_include_time: true,
      },
    ];

    expect(openopsCommonMock.makeOpenOpsTablesPost).toHaveBeenCalledTimes(
      expectedCalls.length,
    );

    expectedCalls.forEach((call, index) => {
      expect(openopsCommonMock.makeOpenOpsTablesPost).toHaveBeenNthCalledWith(
        index + 1,
        'api/database/fields/table/1/',
        call,
        'some header',
      );
    });
  });

  it('should throw if something fails', async () => {
    openopsCommonMock.getFields.mockRejectedValue(new Error('some error'));

    await expect(createOpportunitiesTable('some token', 2)).rejects.toThrow(
      'some error',
    );
  });
});
