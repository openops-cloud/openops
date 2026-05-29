import { ServiceNowAuth } from '../src/lib/servicenow/auth';
import { getServiceNowStateFields } from '../src/lib/servicenow/get-state-fields';
import {
  getServiceNowTableFields,
  ServiceNowTableField,
} from '../src/lib/servicenow/get-table-fields';

jest.mock('../src/lib/servicenow/get-table-fields');

const mockGetTableFields = getServiceNowTableFields as jest.Mock;

describe('getServiceNowStateFields', () => {
  const mockAuth: ServiceNowAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  const field = (
    overrides: Partial<ServiceNowTableField>,
  ): ServiceNowTableField => ({
    element: 'state',
    column_label: 'State',
    internal_type: { value: 'integer' },
    choice: '1',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should include columns whose internal_type is choice', async () => {
    mockGetTableFields.mockResolvedValue([
      field({
        element: 'category',
        column_label: 'Category',
        internal_type: { value: 'choice' },
        choice: '0',
      }),
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([
      {
        element: 'category',
        column_label: 'Category',
        internal_type: 'choice',
      },
    ]);
  });

  test("should include columns with choice flag '1' (dropdown)", async () => {
    mockGetTableFields.mockResolvedValue([
      field({ element: 'state', choice: '1' }),
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([
      { element: 'state', column_label: 'State', internal_type: 'integer' },
    ]);
  });

  test("should include columns with choice flag '3' (dropdown without --None--)", async () => {
    mockGetTableFields.mockResolvedValue([
      field({ element: 'priority', column_label: 'Priority', choice: '3' }),
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([
      {
        element: 'priority',
        column_label: 'Priority',
        internal_type: 'integer',
      },
    ]);
  });

  test('should exclude plain integer columns without a choice flag', async () => {
    mockGetTableFields.mockResolvedValue([
      field({ element: 'sys_mod_count', column_label: 'Updates', choice: '0' }),
      field({
        element: 'reopen_count',
        column_label: 'Reopen count',
        choice: undefined,
      }),
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([]);
  });

  test("should exclude columns with choice flag '2' (suggestion)", async () => {
    mockGetTableFields.mockResolvedValue([
      field({ element: 'category', column_label: 'Category', choice: '2' }),
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([]);
  });

  test('should exclude columns with a blank element', async () => {
    mockGetTableFields.mockResolvedValue([
      field({ element: '', choice: '1' }),
      field({ element: '   ', choice: '1' }),
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([]);
  });

  test('should fall back to element when column_label is missing', async () => {
    mockGetTableFields.mockResolvedValue([
      field({ element: 'state', column_label: '', choice: '1' }),
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([
      { element: 'state', column_label: 'state', internal_type: 'integer' },
    ]);
  });

  test('should handle internal_type provided as a plain string', async () => {
    mockGetTableFields.mockResolvedValue([
      {
        element: 'state',
        column_label: 'State',
        internal_type: 'choice' as unknown as { value: string },
        choice: '0',
      },
    ]);

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([
      { element: 'state', column_label: 'State', internal_type: 'choice' },
    ]);
  });

  test('should return an empty array when the underlying fetch throws', async () => {
    mockGetTableFields.mockRejectedValue(new Error('boom'));

    const result = await getServiceNowStateFields(mockAuth, 'incident');

    expect(result).toEqual([]);
  });
});
