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
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith(
        'FLOW',
        'run_test-run-id/',
        undefined,
        false,
      );
      expect(result).toEqual(mockEntries);
    });

    test('should pass regex pattern to server', async () => {
      const mockContext = createMockContext();
      const mockEntries = [
        { key: 'run_test-run-id/user_123', value: 'value1' },
        { key: 'run_test-run-id/user_789', value: 'value3' },
      ];

      mockContext.store.list.mockResolvedValue(mockEntries);
      mockContext.propsValue.keyFilter = 'user_.*';

      const result = await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith(
        'FLOW',
        'run_test-run-id/',
        'user_.*',
        false,
      );
      expect(result).toEqual(mockEntries);
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
      mockContext.store.list.mockResolvedValue([]);
      mockContext.propsValue.store_scope = BlockStoreScope.PROJECT;

      await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith(
        'COLLECTION',
        '',
        undefined,
        false,
      );
    });

    test('should use correct scope for FLOW scope', async () => {
      const mockContext = createMockContext();
      mockContext.store.list.mockResolvedValue([]);
      mockContext.propsValue.store_scope = BlockStoreScope.FLOW;

      await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith(
        'FLOW',
        '',
        undefined,
        false,
      );
    });

    test('should use correct scope for RUN scope', async () => {
      const mockContext = createMockContext();
      mockContext.store.list.mockResolvedValue([]);
      mockContext.propsValue.store_scope = BlockStoreScope.RUN;

      await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith(
        'FLOW',
        'run_test-run-id/',
        undefined,
        false,
      );
    });

    test('should pass isTest flag correctly', async () => {
      const mockContext = createMockContext(true);
      mockContext.store.list.mockResolvedValue([]);

      await storageListAction.run(mockContext as any);

      expect(mockContext.store.list).toHaveBeenCalledWith(
        'FLOW',
        'run_test-run-id/',
        undefined,
        true,
      );
    });
  });
});
