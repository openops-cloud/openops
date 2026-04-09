import { BlockStoreScope } from '../../src/lib/actions/common';
import { storageGetAction } from '../../src/lib/actions/store-get-action';

type StorageGetContext = Parameters<typeof storageGetAction.run>[0];

describe('Storage Get Action', () => {
  const createMockContext = (isTest = false): StorageGetContext => {
    return {
      run: {
        id: 'test-run-id',
        isTest,
      },
      propsValue: {
        key: 'test-key',
        store_scope: BlockStoreScope.RUN,
        parseJSON: false,
      },
      store: {
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
      },
    } as unknown as StorageGetContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Store get action', () => {
    test('should create action with correct properties', () => {
      expect(storageGetAction.props).toMatchObject({
        key: {
          displayName: 'Key',
          required: true,
        },
        defaultValue: {
          displayName: 'Default Value',
          required: false,
        },
        store_scope: expect.anything(),
        parseJSON: {
          displayName: 'Parse as JSON',
          required: false,
          defaultValue: false,
        },
      });
    });

    test('should get value from store with correct key and scope (RUN scope)', async () => {
      const mockContext = createMockContext();
      const mockValue = 'test-value';
      (mockContext.store.get as jest.Mock).mockResolvedValue(mockValue);

      const result = await storageGetAction.run(mockContext);

      expect(mockContext.store.get).toHaveBeenCalledWith(
        'run_test-run-id/test-key',
        'FLOW',
      );
      expect(result).toBe(mockValue);
    });

    test('should return defaultValue if store returns null', async () => {
      const mockContext = createMockContext();
      mockContext.propsValue['defaultValue'] = 'default-val';
      (mockContext.store.get as jest.Mock).mockResolvedValue(null);

      const result = await storageGetAction.run(mockContext);

      expect(result).toBe('default-val');
    });

    test('should parse JSON if parseJSON is true', async () => {
      const mockContext = createMockContext();
      mockContext.propsValue['parseJSON'] = true;
      const jsonValue = '{"a": 1}';
      (mockContext.store.get as jest.Mock).mockResolvedValue(jsonValue);

      const result = await storageGetAction.run(mockContext);

      expect(result).toEqual({ a: 1 });
    });

    test('should return raw value if parseJSON is true but value is not valid JSON', async () => {
      const mockContext = createMockContext();
      mockContext.propsValue['parseJSON'] = true;
      const nonJsonValue = 'not-json';
      (mockContext.store.get as jest.Mock).mockResolvedValue(nonJsonValue);

      const result = await storageGetAction.run(mockContext);

      expect(result).toBe('not-json');
    });

    test('should use correct scope for PROJECT scope', async () => {
      const mockContext = createMockContext();
      mockContext.propsValue.store_scope = BlockStoreScope.PROJECT;
      (mockContext.store.get as jest.Mock).mockResolvedValue('val');

      await storageGetAction.run(mockContext);

      expect(mockContext.store.get).toHaveBeenCalledWith(
        'test-key',
        'COLLECTION',
      );
    });

    test('should use correct scope for FLOW scope', async () => {
      const mockContext = createMockContext();
      mockContext.propsValue.store_scope = BlockStoreScope.FLOW;
      (mockContext.store.get as jest.Mock).mockResolvedValue('val');

      await storageGetAction.run(mockContext);

      expect(mockContext.store.get).toHaveBeenCalledWith('test-key', 'FLOW');
    });

    test('should use test-run prefix when isTest is true in RUN scope', async () => {
      const mockContext = createMockContext(true);
      mockContext.propsValue.store_scope = BlockStoreScope.RUN;
      (mockContext.store.get as jest.Mock).mockResolvedValue('val');

      await storageGetAction.run(mockContext);

      expect(mockContext.store.get).toHaveBeenCalledWith(
        'run_test-run/test-key',
        'FLOW',
      );
    });
  });
});
