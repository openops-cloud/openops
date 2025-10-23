import { ViewFilterTypesEnum } from '@openops/common';
import {
  buildServiceNowQuery,
  mapFilterTypeToServiceNowOperator,
} from '../../src/lib/filter-to-query';

describe('filter-to-query', () => {
  describe('mapFilterTypeToServiceNowOperator', () => {
    test('should map equal filter type', () => {
      expect(mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.equal)).toBe(
        '=',
      );
    });

    test('should map not_equal filter type', () => {
      expect(
        mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.not_equal),
      ).toBe('!=');
    });

    test('should map contains filter type', () => {
      expect(
        mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.contains),
      ).toBe('LIKE');
    });

    test('should map contains_not filter type', () => {
      expect(
        mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.contains_not),
      ).toBe('NOTLIKE');
    });

    test('should map empty filter type', () => {
      expect(mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.empty)).toBe(
        'ISEMPTY',
      );
    });

    test('should map not_empty filter type', () => {
      expect(
        mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.not_empty),
      ).toBe('ISNOTEMPTY');
    });

    test('should map higher_than filter type', () => {
      expect(
        mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.higher_than),
      ).toBe('>');
    });

    test('should map lower_than filter type', () => {
      expect(
        mapFilterTypeToServiceNowOperator(ViewFilterTypesEnum.lower_than),
      ).toBe('<');
    });
  });

  describe('buildServiceNowQuery', () => {
    test('should build query with single filter', () => {
      const filters = [
        {
          fieldName: 'active',
          filterType: ViewFilterTypesEnum.equal,
          value: 'true',
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('active=true');
    });

    test('should build query with multiple filters using AND', () => {
      const filters = [
        {
          fieldName: 'active',
          filterType: ViewFilterTypesEnum.equal,
          value: 'true',
        },
        {
          fieldName: 'priority',
          filterType: ViewFilterTypesEnum.lower_than,
          value: '3',
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('active=true^priority<3');
    });

    test('should build query with multiple filters using OR', () => {
      const filters = [
        {
          fieldName: 'priority',
          filterType: ViewFilterTypesEnum.equal,
          value: '1',
        },
        {
          fieldName: 'priority',
          filterType: ViewFilterTypesEnum.equal,
          value: '2',
        },
      ];

      const query = buildServiceNowQuery(filters, 'OR');
      expect(query).toBe('priority=1^ORpriority=2');
    });

    test('should handle empty filter type', () => {
      const filters = [
        {
          fieldName: 'comments',
          filterType: ViewFilterTypesEnum.empty,
          value: '',
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('commentsISEMPTY');
    });

    test('should handle not_empty filter type', () => {
      const filters = [
        {
          fieldName: 'comments',
          filterType: ViewFilterTypesEnum.not_empty,
          value: '',
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('commentsISNOTEMPTY');
    });

    test('should handle contains filter type', () => {
      const filters = [
        {
          fieldName: 'short_description',
          filterType: ViewFilterTypesEnum.contains,
          value: 'network',
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('short_descriptionLIKEnetwork');
    });

    test('should handle boolean filter type', () => {
      const filters = [
        {
          fieldName: 'active',
          filterType: ViewFilterTypesEnum.boolean,
          value: true,
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('active=true');
    });

    test('should handle boolean filter type with false value', () => {
      const filters = [
        {
          fieldName: 'active',
          filterType: ViewFilterTypesEnum.boolean,
          value: false,
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('active=false');
    });

    test('should return empty string for empty filters array', () => {
      const query = buildServiceNowQuery([], 'AND');
      expect(query).toBe('');
    });

    test('should handle complex query with mixed filter types', () => {
      const filters = [
        {
          fieldName: 'active',
          filterType: ViewFilterTypesEnum.equal,
          value: 'true',
        },
        {
          fieldName: 'priority',
          filterType: ViewFilterTypesEnum.lower_than_or_equal,
          value: '3',
        },
        {
          fieldName: 'short_description',
          filterType: ViewFilterTypesEnum.contains,
          value: 'urgent',
        },
      ];

      const query = buildServiceNowQuery(filters, 'AND');
      expect(query).toBe('active=true^priority<=3^short_descriptionLIKEurgent');
    });
  });
});
