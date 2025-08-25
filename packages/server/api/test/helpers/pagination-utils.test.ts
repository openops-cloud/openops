import { getValueByPath } from '../../src/app/helper/pagination/pagination-utils';

describe('getValueByPath', () => {
  const testEntity = {
    id: '123',
    name: 'Test Entity',
    metadata: {
      version: '1.0.0',
      tags: ['tag1', 'tag2'],
      config: {
        enabled: true,
        settings: {
          timeout: 5000,
          retries: 3,
        },
      },
    },
    versions: [
      { id: 'v1', name: 'Version 1', updated: '2025-01-01T00:00:00Z' },
      { id: 'v2', name: 'Version 2', updated: '2025-01-02T00:00:00Z' },
      { id: 'v3', name: 'Version 3', updated: '2025-01-03T00:00:00Z' },
    ],
    nested: {
      deep: {
        very: {
          deep: {
            value: 'found it!',
          },
        },
      },
    },
  };

  describe('simple property access', () => {
    test('should return top-level property', () => {
      expect(getValueByPath(testEntity, 'id')).toBe('123');
      expect(getValueByPath(testEntity, 'name')).toBe('Test Entity');
    });

    test('should return nested property', () => {
      expect(getValueByPath(testEntity, 'metadata.version')).toBe('1.0.0');
      expect(getValueByPath(testEntity, 'metadata.config.enabled')).toBe(true);
    });

    test('should return deeply nested property', () => {
      expect(
        getValueByPath(testEntity, 'metadata.config.settings.timeout'),
      ).toBe(5000);
      expect(getValueByPath(testEntity, 'nested.deep.very.deep.value')).toBe(
        'found it!',
      );
    });
  });

  describe('array access', () => {
    test('should return array element by index', () => {
      expect(getValueByPath(testEntity, 'versions[0]')).toEqual({
        id: 'v1',
        name: 'Version 1',
        updated: '2025-01-01T00:00:00Z',
      });
      expect(getValueByPath(testEntity, 'versions[1]')).toEqual({
        id: 'v2',
        name: 'Version 2',
        updated: '2025-01-02T00:00:00Z',
      });
    });

    test('should return nested property from array element', () => {
      expect(getValueByPath(testEntity, 'versions[0].id')).toBe('v1');
      expect(getValueByPath(testEntity, 'versions[1].name')).toBe('Version 2');
      expect(getValueByPath(testEntity, 'versions[2].updated')).toBe(
        '2025-01-03T00:00:00Z',
      );
    });

    test('should return deeply nested property from array element', () => {
      expect(
        getValueByPath(testEntity, 'metadata.config.settings.retries'),
      ).toBe(3);
    });

    test('should handle array access in middle of path', () => {
      const complexEntity = {
        items: [
          {
            details: {
              info: {
                value: 'nested array value',
              },
            },
          },
        ],
      };
      expect(getValueByPath(complexEntity, 'items[0].details.info.value')).toBe(
        'nested array value',
      );
    });
  });

  describe('edge cases and error handling', () => {
    test('should return null for non-existent top-level property', () => {
      expect(getValueByPath(testEntity, 'nonexistent')).toBeNull();
    });

    test('should return null for non-existent nested property', () => {
      expect(getValueByPath(testEntity, 'metadata.nonexistent')).toBeNull();
      expect(
        getValueByPath(testEntity, 'metadata.config.nonexistent'),
      ).toBeNull();
    });

    test('should return null for non-existent array index', () => {
      expect(getValueByPath(testEntity, 'versions[999]')).toBeNull();
      expect(getValueByPath(testEntity, 'versions[-1]')).toBeNull();
    });

    test('should return null for invalid array index', () => {
      expect(getValueByPath(testEntity, 'versions[abc]')).toBeNull();
      expect(getValueByPath(testEntity, 'versions[]')).toBeNull();
    });

    test('should return null for property after non-existent array index', () => {
      expect(getValueByPath(testEntity, 'versions[999].id')).toBeNull();
    });

    test('should return null for property after non-existent nested path', () => {
      expect(
        getValueByPath(testEntity, 'metadata.nonexistent.property'),
      ).toBeNull();
    });

    test('should handle empty path', () => {
      expect(getValueByPath(testEntity, '')).toBeNull();
    });

    test('should handle path with only dots', () => {
      expect(getValueByPath(testEntity, '...')).toBeNull();
    });
  });

  describe('null and undefined handling', () => {
    test('should return null for null entity', () => {
      expect(getValueByPath(null, 'id')).toBeNull();
    });

    test('should return null for undefined entity', () => {
      expect(getValueByPath(undefined, 'id')).toBeNull();
    });

    test('should return null when encountering null in path', () => {
      const entityWithNull = {
        level1: {
          level2: null,
        },
      };
      expect(
        getValueByPath(entityWithNull, 'level1.level2.property'),
      ).toBeNull();
    });

    test('should return null when encountering undefined in path', () => {
      const entityWithUndefined = {
        level1: {
          level2: undefined,
        },
      };
      expect(
        getValueByPath(entityWithUndefined, 'level1.level2.property'),
      ).toBeNull();
    });
  });

  describe('complex scenarios', () => {
    test('should handle mixed array and object access', () => {
      const mixedEntity = {
        users: [
          {
            profile: {
              preferences: {
                theme: 'dark',
                language: 'en',
              },
            },
          },
          {
            profile: {
              preferences: {
                theme: 'light',
                language: 'es',
              },
            },
          },
        ],
      };

      expect(
        getValueByPath(mixedEntity, 'users[0].profile.preferences.theme'),
      ).toBe('dark');
      expect(
        getValueByPath(mixedEntity, 'users[1].profile.preferences.language'),
      ).toBe('es');
    });

    test('should handle array of primitives', () => {
      expect(getValueByPath(testEntity, 'metadata.tags[0]')).toBe('tag1');
      expect(getValueByPath(testEntity, 'metadata.tags[1]')).toBe('tag2');
    });

    test('should handle empty arrays', () => {
      const entityWithEmptyArray = {
        items: [],
      };
      expect(getValueByPath(entityWithEmptyArray, 'items[0]')).toBeNull();
    });

    test('should handle empty objects', () => {
      const entityWithEmptyObject = {
        config: {},
      };
      expect(
        getValueByPath(entityWithEmptyObject, 'config.property'),
      ).toBeNull();
    });
  });
});
