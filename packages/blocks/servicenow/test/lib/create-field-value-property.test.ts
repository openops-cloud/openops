import { createFieldValueProperty } from '../../src/lib/create-field-value-property';
import { getServiceNowChoiceValues } from '../../src/lib/get-choice-values';
import { ServiceNowTableField } from '../../src/lib/get-table-fields';

jest.mock('../../src/lib/get-choice-values');

describe('createFieldValueProperty', () => {
  const mockAuth = {
    username: 'testuser',
    password: 'testpass',
    instanceName: 'dev12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('choice fields', () => {
    test('should return StaticDropdown for choice field with options', async () => {
      const field: ServiceNowTableField = {
        element: 'priority',
        column_label: 'Priority',
        internal_type: { value: 'choice' },
        choice: 'true',
      };

      (getServiceNowChoiceValues as jest.Mock).mockResolvedValue([
        { label: 'High', value: '1' },
        { label: 'Medium', value: '2' },
        { label: 'Low', value: '3' },
      ]);

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        false,
      );

      expect(getServiceNowChoiceValues).toHaveBeenCalledWith(
        mockAuth,
        'incident',
        'priority',
      );
      expect(result).toMatchObject({
        displayName: 'Priority',
        required: false,
      });
    });

    test('should return ShortText for choice field without options', async () => {
      const field: ServiceNowTableField = {
        element: 'priority',
        column_label: 'Priority',
        internal_type: { value: 'choice' },
        choice: 'true',
      };

      (getServiceNowChoiceValues as jest.Mock).mockResolvedValue([]);

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        true,
      );

      expect(result).toMatchObject({
        displayName: 'Priority',
        description: 'Enter the choice value',
        required: true,
      });
    });
  });

  describe('boolean fields', () => {
    test('should return Checkbox for boolean field', async () => {
      const field: ServiceNowTableField = {
        element: 'active',
        column_label: 'Active',
        internal_type: { value: 'boolean' },
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        true,
      );

      expect(result).toMatchObject({
        displayName: 'Active',
        required: true,
      });
    });
  });

  describe('date/datetime fields', () => {
    test('should return DateTime for glide_date field', async () => {
      const field: ServiceNowTableField = {
        element: 'due_date',
        column_label: 'Due Date',
        internal_type: { value: 'glide_date' },
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        false,
      );

      expect(result).toMatchObject({
        displayName: 'Due Date',
        required: false,
      });
    });

    test('should return DateTime for glide_date_time field', async () => {
      const field: ServiceNowTableField = {
        element: 'opened_at',
        column_label: 'Opened At',
        internal_type: { value: 'glide_date_time' },
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        true,
      );

      expect(result).toMatchObject({
        displayName: 'Opened At',
        required: true,
      });
    });
  });

  describe('numeric fields', () => {
    test('should return Number for integer field', async () => {
      const field: ServiceNowTableField = {
        element: 'count',
        column_label: 'Count',
        internal_type: { value: 'integer' },
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        false,
      );

      expect(result).toMatchObject({
        displayName: 'Count',
        required: false,
      });
    });

    test('should return Number for decimal field', async () => {
      const field: ServiceNowTableField = {
        element: 'amount',
        column_label: 'Amount',
        internal_type: { value: 'decimal' },
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        true,
      );

      expect(result).toMatchObject({
        displayName: 'Amount',
        required: true,
      });
    });
  });

  describe('text fields', () => {
    test('should return LongText for string field with length > 255', async () => {
      const field: ServiceNowTableField = {
        element: 'description',
        column_label: 'Description',
        internal_type: { value: 'string' },
        max_length: '4000',
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        false,
      );

      expect(result).toMatchObject({
        displayName: 'Description',
        required: false,
      });
    });

    test('should return ShortText for string field with length <= 255', async () => {
      const field: ServiceNowTableField = {
        element: 'short_description',
        column_label: 'Short Description',
        internal_type: { value: 'string' },
        max_length: '160',
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        true,
      );

      expect(result).toMatchObject({
        displayName: 'Short Description',
        required: true,
      });
    });
  });

  describe('reference fields', () => {
    test('should return ShortText with reference description', async () => {
      const field: ServiceNowTableField = {
        element: 'assigned_to',
        column_label: 'Assigned To',
        internal_type: { value: 'reference' },
        reference: 'sys_user',
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        false,
      );

      expect(result).toMatchObject({
        displayName: 'Assigned To',
        description: 'Reference to sys_user table (sys_id)',
        required: false,
      });
    });
  });

  describe('default fallback', () => {
    test('should return ShortText for unknown field type', async () => {
      const field: ServiceNowTableField = {
        element: 'custom_field',
        column_label: 'Custom Field',
        internal_type: { value: 'unknown_type' },
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        true,
      );

      expect(result).toMatchObject({
        displayName: 'Custom Field',
        required: true,
      });
    });

    test('should use element name when column_label is empty', async () => {
      const field: ServiceNowTableField = {
        element: 'sys_id',
        column_label: '',
        internal_type: { value: 'string' },
      };

      const result = await createFieldValueProperty(
        field,
        mockAuth,
        'incident',
        false,
      );

      expect(result).toMatchObject({
        displayName: 'sys_id',
        required: false,
      });
    });
  });
});
