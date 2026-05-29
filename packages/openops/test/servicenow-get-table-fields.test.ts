import { httpClient } from '@openops/blocks-common';
import { ServiceNowAuth } from '../src/lib/servicenow/auth';
import {
  getServiceNowTableFields,
  ServiceNowTableField,
} from '../src/lib/servicenow/get-table-fields';

jest.mock('@openops/blocks-common');

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('getServiceNowTableFields', () => {
  const mockAuth: ServiceNowAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  const mockTableHierarchy = (tableName: string, parentName?: string): void => {
    mockHttpClient.sendRequest.mockResolvedValueOnce({
      body: {
        result: [
          {
            name: tableName,
            'super_class.name': parentName,
          },
        ],
      },
    } as any);
  };

  const mockTableFields = (fields: ServiceNowTableField[]): void => {
    mockHttpClient.sendRequest.mockResolvedValueOnce({
      body: {
        result: fields,
      },
    } as any);
  };

  const createField = (
    tableName: string,
    element: string,
    label: string,
    type = 'string',
  ): ServiceNowTableField => ({
    name: tableName,
    element,
    column_label: label,
    internal_type: { value: type },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with table hierarchy permissions', () => {
    it('should return fields from both parent and child tables', async () => {
      mockTableHierarchy('incident', 'task');
      mockTableHierarchy('task', undefined);

      mockTableFields([
        createField('incident', 'impact', 'Impact', 'integer'),
        createField('task', 'number', 'Number', 'string'),
        createField('task', 'short_description', 'Short Description', 'string'),
      ]);

      const result = await getServiceNowTableFields(mockAuth, 'incident');

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ element: 'impact', name: 'incident' }),
          expect.objectContaining({ element: 'number', name: 'task' }),
          expect.objectContaining({
            element: 'short_description',
            name: 'task',
          }),
        ]),
      );
      expect(mockHttpClient.sendRequest).toHaveBeenCalledTimes(3);
    });

    it('should deduplicate fields, prioritizing child table definitions', async () => {
      mockTableHierarchy('incident', 'task');
      mockTableHierarchy('task', undefined);

      mockTableFields([
        createField('incident', 'state', 'Incident State', 'integer'),
        createField('task', 'state', 'Task State', 'integer'),
      ]);

      const result = await getServiceNowTableFields(mockAuth, 'incident');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          element: 'state',
          name: 'incident',
          column_label: 'Incident State',
        }),
      );
    });

    it('should filter out fields with empty elements', async () => {
      mockTableHierarchy('incident', undefined);

      mockTableFields([
        createField('incident', 'valid_field', 'Valid Field'),
        { ...createField('incident', '', 'Empty Element') },
        { ...createField('incident', '   ', 'Whitespace Element') },
      ]);

      const result = await getServiceNowTableFields(mockAuth, 'incident');

      expect(result).toHaveLength(1);
      expect(result[0].element).toBe('valid_field');
    });

    it('should handle fields without name property', async () => {
      mockTableHierarchy('incident', undefined);

      mockTableFields([
        createField('incident', 'field_with_name', 'Field With Name'),
        {
          element: 'field_without_name',
          column_label: 'Field Without Name',
        } as ServiceNowTableField,
      ]);

      const result = await getServiceNowTableFields(mockAuth, 'incident');

      expect(result).toHaveLength(1);
      expect(result[0].element).toBe('field_with_name');
    });
  });

  describe('without table hierarchy permissions (graceful fallback)', () => {
    it('should fall back to querying only the requested table when sys_db_object fails', async () => {
      mockHttpClient.sendRequest.mockRejectedValueOnce(
        new Error('Insufficient permissions'),
      );

      mockTableFields([
        createField('incident', 'impact', 'Impact', 'integer'),
        createField('incident', 'urgency', 'Urgency', 'integer'),
      ]);

      const result = await getServiceNowTableFields(mockAuth, 'incident');

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ element: 'impact' }),
          expect.objectContaining({ element: 'urgency' }),
        ]),
      );
      expect(mockHttpClient.sendRequest).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle empty results from sys_dictionary', async () => {
    mockTableHierarchy('incident', undefined);
    mockTableFields([]);

    const result = await getServiceNowTableFields(mockAuth, 'incident');

    expect(result).toEqual([]);
  });

  it('should handle null result from sys_dictionary', async () => {
    mockTableHierarchy('incident', undefined);

    mockHttpClient.sendRequest.mockResolvedValueOnce({
      body: {
        result: null,
      },
    } as any);

    const result = await getServiceNowTableFields(mockAuth, 'incident');

    expect(result).toEqual([]);
  });

  it('should handle deep table hierarchies', async () => {
    mockTableHierarchy('custom_incident', 'incident');
    mockTableHierarchy('incident', 'task');
    mockTableHierarchy('task', undefined);

    mockTableFields([
      createField('custom_incident', 'custom_field', 'Custom Field'),
      createField('incident', 'impact', 'Impact'),
      createField('task', 'number', 'Number'),
    ]);

    const result = await getServiceNowTableFields(mockAuth, 'custom_incident');

    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ element: 'custom_field' }),
        expect.objectContaining({ element: 'impact' }),
        expect.objectContaining({ element: 'number' }),
      ]),
    );
  });
});
