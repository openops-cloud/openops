import { BlockStoreScope } from '../../src/lib/actions/common';
import { storageListAction } from '../../src/lib/actions/store-list-action';

describe('storageListAction', () => {
  const createMockContext = (isTest = false) => ({
    run: {
      id: 'test-run-id',
      isTest,
    },
    propsValue: {
      keyFilter: '',
      store_scope: BlockStoreScope.RUN,
    },
    store: {
      list: jest.fn(),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Store list action', () => {
    test('should create action with correct properties', () => {
      expect(storageListAction.props).toMatchObject({
        keyFilter: {
          type: 'SHORT_TEXT',
          required: false,
        },
        store_scope: {
          type: 'STATIC_DROPDOWN',
          required: true,
        },
      });
    });

    test('should list all entries when no key filter is provided', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'run_test-run-id/key1', value: 'value1' },
        { key: 'run_test-run-id/key2', value: 'value2' },
        { key: 'run_test-run-id/key3', value: 'value3' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual(mockEntries);
    });

    test('should list all entries when key filter is empty string', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'run_test-run-id/key1', value: 'value1' },
        { key: 'run_test-run-id/key2', value: 'value2' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = '';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual(mockEntries);
    });

    test('should list all entries when key filter is whitespace only', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'run_test-run-id/key1', value: 'value1' },
        { key: 'run_test-run-id/key2', value: 'value2' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = '   ';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual(mockEntries);
    });

    test('should filter entries when valid regex pattern is provided for regular run', async () => {
      const mockContext = createMockContext(false);
      const mockEntries = [
        { key: 'run_test-run-id/user_123', value: 'value1' },
        { key: 'run_test-run-id/config_456', value: 'value2' },
        { key: 'run_test-run-id/temp_789', value: 'value3' },
        { key: 'run_test-run-id/user_999', value: 'value4' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'user_.*';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([
        { key: 'run_test-run-id/user_123', value: 'value1' },
        { key: 'run_test-run-id/user_999', value: 'value4' },
      ]);
    });

    test('should filter entries by key name only when test run', async () => {
      const mockContext = createMockContext(true);
      const mockEntries = [
        { key: 'run_test-run/user_123', value: 'value1' },
        { key: 'run_test-run/config_456', value: 'value2' },
        { key: 'run_test-run/temp_789', value: 'value3' },
        { key: 'run_test-run/user_999', value: 'value4' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'user_.*';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([
        { key: 'run_test-run/user_123', value: 'value1' },
        { key: 'run_test-run/user_999', value: 'value4' },
      ]);
    });

    test('should filter entries with case sensitive regex for regular run', async () => {
      const mockContext = createMockContext(false);
      const mockEntries = [
        { key: 'run_test-run-id/User_123', value: 'value1' },
        { key: 'run_test-run-id/user_456', value: 'value2' },
        { key: 'run_test-run-id/USER_789', value: 'value3' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'user_.*';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([
        { key: 'run_test-run-id/user_456', value: 'value2' },
      ]);
    });

    test('should filter entries with case sensitive regex for test run', async () => {
      const mockContext = createMockContext(true);
      const mockEntries = [
        { key: 'run_test-run/User_123', value: 'value1' },
        { key: 'run_test-run/user_456', value: 'value2' },
        { key: 'run_test-run/USER_789', value: 'value3' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'user_.*';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([
        { key: 'run_test-run/user_456', value: 'value2' },
      ]);
    });

    test('should throw error when invalid regex pattern is provided', async () => {
      const mockContext = createMockContext();
      mockContext.propsValue.keyFilter = '[invalid';

      await expect(storageListAction.run(mockContext as any)).rejects.toThrow(
        'Invalid regex pattern: [invalid',
      );

      expect(mockContext.store.list).not.toHaveBeenCalled();
    });

    test('should use correct scope for PROJECT scope', async () => {
      const mockContext = createMockContext();
      const mockEntries = [{ key: 'key1', value: 'value1' }];
      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.store_scope = BlockStoreScope.PROJECT;

      await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('COLLECTION');
    });

    test('should use correct scope for FLOW scope', async () => {
      const mockContext = createMockContext();
      const mockEntries = [{ key: 'key1', value: 'value1' }];
      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.store_scope = BlockStoreScope.FLOW;

      await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
    });

    test('should use correct scope for RUN scope', async () => {
      const mockContext = createMockContext();
      const mockEntries = [{ key: 'key1', value: 'value1' }];
      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.store_scope = BlockStoreScope.RUN;

      await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
    });

    test('should handle empty result from store', async () => {
      const mockContext = createMockContext();
      mockContext.store.list.mockResolvedValue([]);

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([]);
    });

    test('should handle complex regex patterns for regular run', async () => {
      const mockContext = createMockContext(false);
      const mockEntries = [
        { key: 'run_test-run-id/prod_user_123', value: 'value1' },
        { key: 'run_test-run-id/dev_user_456', value: 'value2' },
        { key: 'run_test-run-id/test_config_789', value: 'value3' },
        { key: 'run_test-run-id/prod_config_999', value: 'value4' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'prod_.*_\\d+';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([
        { key: 'run_test-run-id/prod_user_123', value: 'value1' },
        { key: 'run_test-run-id/prod_config_999', value: 'value4' },
      ]);
    });

    test('should handle complex regex patterns for test run', async () => {
      const mockContext = createMockContext(true);
      const mockEntries = [
        { key: 'run_test-run/prod_user_123', value: 'value1' },
        { key: 'run_test-run/dev_user_456', value: 'value2' },
        { key: 'run_test-run/test_config_789', value: 'value3' },
        { key: 'run_test-run/prod_config_999', value: 'value4' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'prod_.*_\\d+';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([
        { key: 'run_test-run/prod_user_123', value: 'value1' },
        { key: 'run_test-run/prod_config_999', value: 'value4' },
      ]);
    });

    test('should filter by exact key name in test run', async () => {
      const mockContext = createMockContext(true);
      const mockEntries = [
        { key: 'run_test-run/myKey', value: 'value1' },
        { key: 'run_test-run/myKey_123', value: 'value2' },
        { key: 'run_test-run/otherKey', value: 'value3' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = '^myKey$';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW');
      expect(result).toEqual([{ key: 'run_test-run/myKey', value: 'value1' }]);
    });
  });
});
