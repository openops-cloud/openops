jest.useFakeTimers();

import {
  getRegionsDropdownState,
  getRegionsList,
  groupARNsByRegion,
  regionsStaticMultiSelectDropdown,
} from '../src/lib/aws/regions';

describe('regionsStaticMultiSelectDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have regions property with correct values', () => {
    const commonProperties = regionsStaticMultiSelectDropdown(true);
    expect(commonProperties.regions.displayName).toEqual('Regions');
    expect(commonProperties.regions.description).toEqual(
      'A list of AWS regions.',
    );
    expect(commonProperties.regions.refreshers).toBeUndefined();
    expect(commonProperties.regions.required).toBe(true);
    expect(commonProperties.regions.type).toEqual(
      'STATIC_MULTI_SELECT_DROPDOWN',
    );
  });
});

describe('getRegionsDropdownState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have dropstate with valid regions', async () => {
    const commonProperties = getRegionsDropdownState();

    expect(commonProperties.disabled).toEqual(false);
    expect(commonProperties.options).toEqual([
      { label: 'us-east-1 (US East (N. Virginia))', value: 'us-east-1' },
      { label: 'us-east-2 (US East (Ohio))', value: 'us-east-2' },
      { label: 'us-west-1 (US West (N. California))', value: 'us-west-1' },
      { label: 'us-west-2 (US West (Oregon))', value: 'us-west-2' },
      { label: 'af-south-1 (Africa (Cape Town))', value: 'af-south-1' },
      { label: 'ap-east-1 (Asia Pacific (Hong Kong))', value: 'ap-east-1' },
      { label: 'ap-south-1 (Asia Pacific (Mumbai))', value: 'ap-south-1' },
      { label: 'ap-south-2 (Asia Pacific (Hyderabad))', value: 'ap-south-2' },
      {
        label: 'ap-southeast-1 (Asia Pacific (Singapore))',
        value: 'ap-southeast-1',
      },
      {
        label: 'ap-southeast-2 (Asia Pacific (Sydney))',
        value: 'ap-southeast-2',
      },
      {
        label: 'ap-southeast-3 (Asia Pacific (Jakarta))',
        value: 'ap-southeast-3',
      },
      {
        label: 'ap-southeast-4 (Asia Pacific (Melbourne))',
        value: 'ap-southeast-4',
      },
      {
        label: 'ap-southeast-5 (Asia Pacific (Malaysia))',
        value: 'ap-southeast-5',
      },
      {
        label: 'ap-southeast-7 (Asia Pacific (Thailand))',
        value: 'ap-southeast-7',
      },
      {
        label: 'ap-northeast-1 (Asia Pacific (Tokyo))',
        value: 'ap-northeast-1',
      },
      {
        label: 'ap-northeast-2 (Asia Pacific (Seoul))',
        value: 'ap-northeast-2',
      },
      {
        label: 'ap-northeast-3 (Asia Pacific (Osaka))',
        value: 'ap-northeast-3',
      },
      { label: 'ca-central-1 (Canada (Central))', value: 'ca-central-1' },
      { label: 'ca-west-1 (Canada West (Calgary))', value: 'ca-west-1' },
      { label: 'eu-central-1 (Europe (Frankfurt))', value: 'eu-central-1' },
      { label: 'eu-central-2 (Europe (Zurich))', value: 'eu-central-2' },
      { label: 'eu-west-1 (Europe (Ireland))', value: 'eu-west-1' },
      { label: 'eu-west-2 (Europe (London))', value: 'eu-west-2' },
      { label: 'eu-west-3 (Europe (Paris))', value: 'eu-west-3' },
      { label: 'eu-south-1 (Europe (Milan))', value: 'eu-south-1' },
      { label: 'eu-south-2 (Europe (Spain))', value: 'eu-south-2' },
      { label: 'eu-north-1 (Europe (Stockholm))', value: 'eu-north-1' },
      { label: 'il-central-1 (Israel (Tel Aviv))', value: 'il-central-1' },
      { label: 'mx-central-1 (Mexico (Central))', value: 'mx-central-1' },
      { label: 'me-south-1 (Middle East (Bahrain))', value: 'me-south-1' },
      { label: 'me-central-1 (Middle East (UAE))', value: 'me-central-1' },
      { label: 'sa-east-1 (South America (São Paulo))', value: 'sa-east-1' },
    ]);
  });
});

describe('getRegionsList', () => {
  test('should return non-empty array of region items', () => {
    const result = getRegionsList();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should return items with id and displayName', () => {
    const result = getRegionsList();
    for (const item of result) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('displayName');
      expect(typeof item.id).toBe('string');
      expect(typeof item.displayName).toBe('string');
    }
  });

  test('should include known regions with correct display names', () => {
    const result = getRegionsList();
    const usEast1 = result.find((r) => r.id === 'us-east-1');
    const euWest1 = result.find((r) => r.id === 'eu-west-1');
    expect(usEast1).toEqual({
      id: 'us-east-1',
      displayName: 'US East (N. Virginia)',
    });
    expect(euWest1).toEqual({
      id: 'eu-west-1',
      displayName: 'Europe (Ireland)',
    });
  });
});

describe('groupARNsByRegion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should group ARNs by region correctly', () => {
    const arns = [
      'arn:aws:service:us-east-1:123456789012:resource1',
      'arn:aws:service:us-west-2:123456789012:resource2',
      'arn:aws:service:us-east-1:123456789012:resource3',
    ];

    const result = groupARNsByRegion(arns);

    expect(result).toEqual({
      'us-east-1': [
        'arn:aws:service:us-east-1:123456789012:resource1',
        'arn:aws:service:us-east-1:123456789012:resource3',
      ],
      'us-west-2': ['arn:aws:service:us-west-2:123456789012:resource2'],
    });
  });

  test('should return an empty record for an empty array of ARNs', () => {
    const result = groupARNsByRegion([]);
    expect(result).toEqual({});
  });

  test('should handle a single ARN correctly', () => {
    const arns = ['arn:aws:service:us-east-1:123456789012:resource1'];

    const result = groupARNsByRegion(arns);

    expect(result).toEqual({
      'us-east-1': ['arn:aws:service:us-east-1:123456789012:resource1'],
    });
  });

  test('should handle multiple ARNs in the same region correctly', () => {
    const arns = [
      'arn:aws:service:us-east-1:123456789012:resource1',
      'arn:aws:service:us-east-1:123456789012:resource2',
    ];

    const result = groupARNsByRegion(arns);

    expect(result).toEqual({
      'us-east-1': [
        'arn:aws:service:us-east-1:123456789012:resource1',
        'arn:aws:service:us-east-1:123456789012:resource2',
      ],
    });
  });
});
