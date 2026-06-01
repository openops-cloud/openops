import { getAzureRetryDelayMs } from '@openops/blocks-common';

describe('getAzureRetryDelayMs', () => {
  test('should use Azure Cost Management retry headers', () => {
    expect(
      getAzureRetryDelayMs({
        'x-ms-ratelimit-microsoft.costmanagement-entity-retry-after': '1',
      }),
    ).toBe(1000);
  });

  test('should use Azure Retail Prices retry headers', () => {
    expect(
      getAzureRetryDelayMs({
        'x-ms-ratelimit-retailprices-retry-after': '60',
      }),
    ).toBe(60000);
  });

  test('should use the longest matching Azure retry header value', () => {
    expect(
      getAzureRetryDelayMs({
        'x-ms-ratelimit-microsoft.costmanagement-entity-retry-after': '3',
        'x-ms-ratelimit-microsoft.costmanagement-clienttype-retry-after': '1',
        'x-ms-ratelimit-retailprices-retry-after': '2',
      }),
    ).toBe(3000);
  });

  test('should ignore non-matching headers', () => {
    expect(
      getAzureRetryDelayMs({
        'retry-after': '10',
      }),
    ).toBeUndefined();
  });

  test('should ignore invalid matching header values', () => {
    expect(
      getAzureRetryDelayMs({
        'x-ms-ratelimit-retailprices-retry-after': 'abc',
      }),
    ).toBeUndefined();
  });

  test('should ignore zero and negative retry values', () => {
    expect(
      getAzureRetryDelayMs({
        'x-ms-ratelimit-retailprices-retry-after': '0',
        'x-ms-ratelimit-microsoft.costmanagement-entity-retry-after': '-1',
      }),
    ).toBeUndefined();
  });

  test('should cap matching retry values at ten minutes', () => {
    expect(
      getAzureRetryDelayMs({
        'x-ms-ratelimit-retailprices-retry-after': '1200',
      }),
    ).toBe(600000);
  });
});
