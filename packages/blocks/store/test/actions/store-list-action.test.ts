import { BlockStoreScope } from '../../src/lib/actions/common';
import { storageListAction } from '../../src/lib/actions/store-list-action';

describe('storageListAction', () => {
  const createMockContext = () => ({
    run: {
      id: 'test-run-id',
      isTest: false,
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
          required: true,
          supportsAI: true,
        },
        store_scope: {
          type: 'DROPDOWN',
          required: true,
        },
      });
    });

    test('should list all entries when no key filter is provided', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
      expect(result).toEqual(mockEntries);
    });

    test('should list all entries when key filter is empty string', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = '';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
      expect(result).toEqual(mockEntries);
    });

    test('should list all entries when key filter is whitespace only', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = '   ';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
      expect(result).toEqual(mockEntries);
    });

    test('should filter entries when valid regex pattern is provided', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'user_123', value: 'value1' },
        { key: 'config_456', value: 'value2' },
        { key: 'temp_789', value: 'value3' },
        { key: 'user_999', value: 'value4' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'user_.*';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
      expect(result).toEqual([
        { key: 'user_123', value: 'value1' },
        { key: 'user_999', value: 'value4' },
      ]);
    });

    test('should filter entries with case sensitive regex', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'User_123', value: 'value1' },
        { key: 'user_456', value: 'value2' },
        { key: 'USER_789', value: 'value3' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'user_.*';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
      expect(result).toEqual([{ key: 'user_456', value: 'value2' }]);
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

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
    });

    test('should handle empty result from store', async () => {
      const mockContext = createMockContext();
      mockContext.store.list.mockResolvedValue([]);

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
      expect(result).toEqual([]);
    });

    test('should handle complex regex patterns', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'prod_user_123', value: 'value1' },
        { key: 'dev_user_456', value: 'value2' },
        { key: 'test_config_789', value: 'value3' },
        { key: 'prod_config_999', value: 'value4' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'prod_.*_\\d+';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith('FLOW_RUN');
      expect(result).toEqual([
        { key: 'prod_user_123', value: 'value1' },
        { key: 'prod_config_999', value: 'value4' },
      ]);
    });
  });
});
