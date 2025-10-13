import { Filter, SnapshotState } from '@aws-sdk/client-ec2';
import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  AwsTag,
  convertToARNArrayWithValidation,
  convertToRegionsArrayWithValidation,
  dryRunCheckBox,
  filterByArnsOrRegionsProperties,
  filterTags,
  filterTagsProperties,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsListFromAuth,
  getEbsSnapshots,
  groupARNsByRegion,
  parseArn,
} from '@openops/common';

export const ebsGetSnapshotsAction = createAction({
  auth: amazonAuth,
  name: 'ebs_get_snapshots',
  description: 'Get EBS snapshots that match the given criteria',
  displayName: 'EBS Get Snapshots',
  IsWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    ...filterByArnsOrRegionsProperties(
      'Snapshots ARNs',
      'Filter by snapshots arns',
    ),
    volumeIds: Property.Array({
      displayName: 'Volume IDs',
      description: 'Filter by volume ids',
      required: false,
    }),
    storageTier: Property.StaticDropdown({
      displayName: 'Storage Tier',
      description: 'The storage tier of the snapshot',
      required: false,
      options: {
        disabled: false,
        options: [
          { label: 'Archive', value: 'archive' },
          { label: 'Standing', value: 'standard' },
        ],
      },
    }),
    status: Property.StaticDropdown({
      displayName: 'Snapshot Status',
      description: 'The status of the snapshot',
      required: false,
      options: {
        disabled: false,
        options: Object.entries(SnapshotState).map(([label, value]) => ({
          label,
          value,
        })),
      },
    }),
    dryRun: dryRunCheckBox(),
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
    try {
      const {
        accounts,
        filterByARNs,
        filterProperty,
        tags,
        condition,
        dryRun,
        minimumCreationDate,
        maximumCreationDate,
      } = context.propsValue;
      const filters: Filter[] | undefined = getFilters(context);
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
          const snapshotIdFilter = {
            Name: 'snapshot-id',
            Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
          };
          promises.push(
            ...credentials.map((credentials) =>
              getEbsSnapshots(credentials, [region], dryRun, [
                ...filters,
                snapshotIdFilter,
              ]),
            ),
          );
        }
      } else {
        const regions = convertToRegionsArrayWithValidation(
          filterProperty['regions'],
        );
        promises.push(
          ...credentials.map((credentials) =>
            getEbsSnapshots(credentials, regions, dryRun, filters),
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
    } catch (error) {
      throw new Error(
        'An error occurred while fetching EBS snapshots: ' + error,
      );
    }
  },
});

function filterByDate(
  snapshots: any[],
  minimumCreationDate?: string,
  maximumCreationDate?: string,
) {
  return snapshots.filter((snapshot) => {
    const creationDate = new Date(snapshot.StartTime);
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
    filterTags((snapshots.Tags as AwsTag[]) ?? [], tags, condition),
  );
}

function getFilters(context: any): Filter[] {
  const filters: Filter[] = [];

  if (context.propsValue.status) {
    filters.push({ Name: 'status', Values: context.propsValue.status });
  }

  if (context.propsValue.storageTier) {
    filters.push({
      Name: 'storage-tier',
      Values: context.propsValue.storageTier,
    });
  }

  if (context.propsValue.volumeIds && context.propsValue.volumeIds.length) {
    filters.push({ Name: 'volume-id', Values: context.propsValue.volumeIds });
  }

  if (filters.length) {
    return filters;
  }

  return [];
}
