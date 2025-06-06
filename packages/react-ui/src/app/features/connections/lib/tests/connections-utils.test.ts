import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import { aggregateBlocksByProvider, filterBlocks } from '../connections-utils';

describe('filterBlocks', () => {
  const blocks: BlockMetadataModelSummary[] = [
    {
      name: 'block/aws-cost-explorer',
      displayName: 'AWS Cost Explorer',
      logoUrl: '',
      description: '',
      auth: { type: 'OAUTH2', authProviderKey: 'aws' },
    } as any,
    {
      name: 'block/aws-billing',
      displayName: 'AWS Billing',
      logoUrl: '',
      description: '',
      auth: { type: 'OAUTH2', authProviderKey: 'aws' },
    } as any,
    {
      name: 'block/azure-cost-management',
      displayName: 'Azure Cost Management',
      logoUrl: '',
      description: '',
      auth: { type: 'OAUTH2', authProviderKey: 'azure' },
    } as any,
    {
      name: 'block/no-auth',
      displayName: 'NoAuth Block',
      logoUrl: '',
      description: '',
      auth: null,
    } as any,
  ];

  it('should filter blocks by search term (case-insensitive)', () => {
    const result = filterBlocks(blocks, 'aws');
    expect(result).toHaveLength(2);
    expect(result[0].displayName).toBe('AWS Cost Explorer');
    expect(result[1].displayName).toBe('AWS Billing');
  });

  it('should filter blocks by search term (partial match)', () => {
    const result = filterBlocks(blocks, 'azure');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('Azure Cost Management');
  });

  it('should return empty array if no matches', () => {
    const result = filterBlocks(blocks, 'gcp');
    expect(result).toHaveLength(0);
  });

  it('should exclude blocks with nil auth', () => {
    const result = filterBlocks(blocks, 'block');
    expect(result).toHaveLength(0);
  });
});

describe('aggregateBlocksByProvider', () => {
  const blocks: BlockMetadataModelSummary[] = [
    {
      name: 'block/aws-cost-explorer',
      displayName: 'AWS Cost Explorer',
      logoUrl: '',
      description: '',
      auth: { type: 'OAUTH2', authProviderKey: 'aws' },
    } as any,
    {
      name: 'block/aws-billing',
      displayName: 'AWS Billing',
      logoUrl: '',
      description: '',
      auth: { type: 'OAUTH2', authProviderKey: 'aws' },
    } as any,
    {
      name: 'block/azure-cost-management',
      displayName: 'Azure Cost Management',
      logoUrl: '',
      description: '',
      auth: { type: 'OAUTH2', authProviderKey: 'azure' },
    } as any,
    {
      name: 'block/no-auth',
      displayName: 'NoAuth Block',
      logoUrl: '',
      description: '',
      auth: null,
    } as any,
  ];

  it('should aggregate blocks by authProviderKey, keeping the first occurrence', () => {
    const result = aggregateBlocksByProvider(blocks);
    // Should only include the first AWS and Azure block, and the no-auth block if not filtered out
    expect(
      result.filter((b) => b.auth && (b.auth as any).authProviderKey === 'aws'),
    ).toHaveLength(1);
    expect(
      result.filter(
        (b) => b.auth && (b.auth as any).authProviderKey === 'azure',
      ),
    ).toHaveLength(1);
    const awsBlock = result.find(
      (b) => b.auth && (b.auth as any).authProviderKey === 'aws',
    );
    expect(awsBlock?.name).toBe('block/aws-cost-explorer');
    const azureBlock = result.find(
      (b) => b.auth && (b.auth as any).authProviderKey === 'azure',
    );
    expect(azureBlock?.name).toBe('block/azure-cost-management');
  });

  it('should return empty array if input is empty', () => {
    const result = aggregateBlocksByProvider([]);
    expect(result).toEqual([]);
  });

  it('should handle blocks with null or undefined authProviderKey', () => {
    const blocksWithNullKey = [
      {
        name: 'block/null-auth',
        displayName: 'NullKey Block',
        logoUrl: '',
        description: '',
        auth: { type: 'OAUTH2', authProviderKey: null },
      } as any,
    ];
    const result = aggregateBlocksByProvider(blocksWithNullKey);
    expect(result).toHaveLength(1);
    expect(
      result[0].auth && (result[0].auth as any).authProviderKey,
    ).toBeNull();
  });
});
