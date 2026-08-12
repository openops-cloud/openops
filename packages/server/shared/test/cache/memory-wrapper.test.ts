import { memoryWrapper } from '../../src/lib/cache/memory-wrapper';

describe('memoryWrapper', () => {
  const testKey = 'testKey';
  const testValue = 'testValue';
  const serializedObjectKey = 'serializedObject';
  const testObject = { name: 'Test', value: 42 };

  beforeEach(async () => {
    // Clear the cache before each test
    await memoryWrapper.deleteKey(testKey);
    await memoryWrapper.deleteKey(serializedObjectKey);
  });

  test('setKey and getKey should store and retrieve a value', async () => {
    await memoryWrapper.setKey(testKey, testValue);
    const result = await memoryWrapper.getKey(testKey);
    expect(result).toBe(testValue);
  });

  test('getKey should return null for a non-existent key', async () => {
    const result = await memoryWrapper.getKey('nonExistentKey');
    expect(result).toBeNull();
  });

  test('deleteKey should remove a key from the cache', async () => {
    await memoryWrapper.setKey(testKey, testValue);
    await memoryWrapper.deleteKey(testKey);
    const result = await memoryWrapper.getKey(testKey);
    expect(result).toBeNull();
  });

  test('keyExists should return true if the key exists', async () => {
    await memoryWrapper.setKey(testKey, testValue);
    const exists = await memoryWrapper.keyExists(testKey);
    expect(exists).toBe(true);
  });

  test('keyExists should return false if the key does not exist', async () => {
    const exists = await memoryWrapper.keyExists('nonExistentKey');
    expect(exists).toBe(false);
  });

  test('setSerializedObject and getSerializedObject should store and retrieve a serialized object', async () => {
    await memoryWrapper.setSerializedObject(serializedObjectKey, testObject);
    const result =
      await memoryWrapper.getSerializedObject<typeof testObject>(
        serializedObjectKey,
      );
    expect(result).toEqual(testObject);
  });

  test('getSerializedObject should return null for a non-existent key', async () => {
    const result =
      await memoryWrapper.getSerializedObject<typeof testObject>(
        'nonExistentKey',
      );
    expect(result).toBeNull();
  });

  test('setKey should expire a key after the specified TTL', async () => {
    const shortTTL = 1; // 1 second
    await memoryWrapper.setKey(testKey, testValue, shortTTL);
    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const result = await memoryWrapper.getKey(testKey);
    expect(result).toBeNull();
  });
});
