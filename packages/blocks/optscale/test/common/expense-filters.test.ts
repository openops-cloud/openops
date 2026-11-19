import {
  expenseFilterProperties,
  toExpenseFilterQuery,
} from '../../src/lib/common/expense-filters';

describe('expense filters', () => {
  test('maps filter values to OptScale query parameters', () => {
    expect(
      toExpenseFilterQuery({
        cloudAccountIds: ['ca-1'],
        poolIds: ['p-1', 'p-2'],
        ownerIds: ['e-1'],
        regions: [' us-east-1 ', ''],
        serviceNames: ['AmazonEC2'],
        tags: ['team'],
      }),
    ).toEqual({
      cloud_account_id: ['ca-1'],
      pool_id: ['p-1', 'p-2'],
      owner_id: ['e-1'],
      region: ['us-east-1'],
      service_name: ['AmazonEC2'],
      tag: ['team'],
    });
  });

  test('omits empty filters', () => {
    expect(toExpenseFilterQuery({ regions: [], tags: [' '] })).toEqual({
      cloud_account_id: undefined,
      pool_id: undefined,
      owner_id: undefined,
      region: undefined,
      service_name: undefined,
      tag: undefined,
    });
  });

  test('all filters are optional', () => {
    for (const property of Object.values(expenseFilterProperties)) {
      expect(property.required).toBe(false);
    }
  });
});
