import { Filter } from '@aws-sdk/client-rds';
import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  AwsTag,
  convertToARNArrayWithValidation,
  convertToRegionsArrayWithValidation,
  describeRdsSnapshots,
  filterByArnsOrRegionsProperties,
  filterTags,
  filterTagsProperties,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsListFromAuth,
  groupARNsByRegion,
  parseArn,
} from '@openops/common';

export const rdsGetSnapshotsAction = createAction({
  auth: amazonAuth,
  name: 'rds_describe_snapshots',
  description: 'Get RDS snapshots that match the given criteria',
  displayName: 'RDS Get Snapshots',
  requireToolApproval: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    ...filterByArnsOrRegionsProperties(
      'Snapshot ARNs',
      'Filter by snapshot arns',
    ),
    instanceIds: Property.Array({
      displayName: 'Instance IDs',
      description: 'Filter by instance ids',
      required: false,
    }),
    snapshotType: Property.Array({
      displayName: 'Snapshot Types',
      description: 'Filter by snapshot types',
      required: false,
    }),
    minimumCreationDate: Property.DateTime({
      displayName: 'Minimum Creation Date',
      description: 'Format yyyy-mm-ddT00:00:00.000Z',
      required: false,
    }),
    maximumCreationDate: Property.DateTime({
      displayName: 'Maximum Creation Date',
      description: 'Format yyyy-mm-ddT00:00:00.000Z',
      required: false,
    }),
    ...filterTagsProperties(),
  },
  async run(context) {
    const {
      accounts,
      filterByARNs,
      filterProperty,
      tags,
      condition,
      minimumCreationDate,
      maximumCreationDate,
    } = context.propsValue;
    const filters: Filter[] = getFilters(context);
    const credentials = await getCredentialsListFromAuth(
      context.auth,
      accounts['accounts'],
    );

    const promises: any[] = [];
    if (filterByARNs) {
      const arns = convertToARNArrayWithValidation(
        filterProperty['arns'] as unknown as string[],
      );
      const groupedARNs = groupARNsByRegion(arns);

      for (const region in groupedARNs) {
        const arnsForRegion = groupedARNs[region];
        const instanceFilter = {
          Name: 'db-snapshot-id',
          Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
        };
        promises.push(
          ...credentials.map((credentials) =>
            describeRdsSnapshots(
              credentials,
              [region] as [string, ...string[]],
              [...filters, instanceFilter],
            ),
          ),
        );
      }
    } else {
      const regions = convertToRegionsArrayWithValidation(
        filterProperty['regions'],
      );
      promises.push(
        ...credentials.map((credentials) =>
          describeRdsSnapshots(credentials, regions, filters),
        ),
      );
    }

    let snapshots = (await Promise.all(promises)).flat();

    if (tags?.length > 0) {
      snapshots = filterByTags(snapshots, tags, condition);
    }

    if (minimumCreationDate || maximumCreationDate) {
      snapshots = filterByDate(
        snapshots,
        minimumCreationDate,
        maximumCreationDate,
      );
    }

    return snapshots;
  },
});

function filterByDate(
  snapshots: any[],
  minimumCreationDate?: string,
  maximumCreationDate?: string,
) {
  return snapshots.filter((snapshot) => {
    const creationDate = new Date(snapshot.SnapshotCreateTime);
    const minDate = minimumCreationDate
      ? new Date(minimumCreationDate)
      : new Date(0);
    const maxDate = maximumCreationDate
      ? new Date(maximumCreationDate)
      : new Date();
    return creationDate >= minDate && creationDate <= maxDate;
  });
}

function filterByTags(snapshots: any[], tags: any[], condition?: string) {
  return snapshots.filter((snapshots) =>
    filterTags((snapshots.TagList as AwsTag[]) ?? [], tags, condition),
  );
}

function getFilters(context: any): Filter[] {
  const filters: Filter[] = [];

  if (
    context.propsValue.snapshotType &&
    context.propsValue.snapshotType.length > 0
  ) {
    filters.push({
      Name: 'snapshot-type',
      Values: context.propsValue.snapshotType,
    });
  }

  if (
    context.propsValue.instanceIds &&
    context.propsValue.instanceIds.length > 0
  ) {
    filters.push({
      Name: 'db-instance-id',
      Values: context.propsValue.instanceIds,
    });
  }

  if (
    context.propsValue.resourceIds &&
    context.propsValue.resourceIds.length > 0
  ) {
    filters.push({
      Name: 'dbi-resource-id',
      Values: context.propsValue.resourceIds,
    });
  }

  if (filters.length) {
    return filters;
  }

  return [];
}
