import { Filter, VolumeType } from '@aws-sdk/client-ec2';
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
  getEbsVolumes,
  getEbsVolumesAllowPartial,
  groupARNsByRegion,
  parseArn,
} from '@openops/common';

const volumeTypeArray = Object.entries(VolumeType).map(([label, value]) => ({
  label,
  value,
}));

export const ebsGetVolumesAction = createAction({
  auth: amazonAuth,
  name: 'ebs_get_volumes',
  description: 'Get EBS volumes that match the given criteria',
  displayName: 'EBS Get Volumes',
  isWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    ...filterByArnsOrRegionsProperties(
      'Volumes ARNs',
      'Filter by volumes arns',
    ),
    shouldQueryOnlyUnattached: Property.Checkbox({
      displayName: 'Get Only Unattached',
      description: 'Query only unattached volumes',
      required: false,
    }),
    volumeTypes: Property.StaticMultiSelectDropdown({
      displayName: 'Volume Types',
      description: 'Query only volumes of the selected types',
      required: false,
      options: {
        disabled: false,
        options: volumeTypeArray,
      },
    }),
    dryRun: dryRunCheckBox(),
    ...filterTagsProperties(),
    allowPartialResults: Property.Checkbox({
      displayName: 'Allow Partial Results',
      description:
        'When enabled, the step returns partial results if the operation fails in some selected regions.',
      required: false,
      defaultValue: false,
    }),
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
        allowPartialResults,
      } = context.propsValue;
      const filters: Filter[] | undefined = getFilters(context);
      const credentials = await getCredentialsListFromAuth(
        context.auth,
        accounts['accounts'],
      );
      const partial = allowPartialResults === true;
      const batches = buildEbsGetVolumesBatches(
        filterByARNs,
        filterProperty,
        credentials,
        filters,
      );

      if (partial) {
        const partialOutcomes = await Promise.all(
          batches.map((batch) =>
            getEbsVolumesAllowPartial(
              batch.creds,
              batch.regions,
              dryRun,
              batch.fetchFilters,
            ),
          ),
        );
        let volumes = partialOutcomes.flatMap((o) => o.results);
        const failedRegions = partialOutcomes.flatMap((o) => o.failedRegions);

        if (tags?.length) {
          volumes = volumes.filter((volume) =>
            filterTags((volume.Tags as AwsTag[]) ?? [], tags, condition),
          );
        }

        return { results: volumes, failedRegions };
      }

      const volumes = (
        await Promise.all(
          batches.map((batch) =>
            getEbsVolumes(
              batch.creds,
              batch.regions,
              dryRun,
              batch.fetchFilters,
            ),
          ),
        )
      ).flat();

      if (tags?.length) {
        return volumes.filter((volume) =>
          filterTags((volume.Tags as AwsTag[]) ?? [], tags, condition),
        );
      }

      return volumes;
    } catch (error) {
      throw new Error('An error occurred while fetching EBS volumes: ' + error);
    }
  },
});

type EbsGetVolumesBatch = {
  creds: unknown;
  regions: [string, ...string[]];
  fetchFilters: Filter[];
};

function buildEbsGetVolumesBatches(
  filterByARNs: boolean,
  filterProperty: Record<string, unknown>,
  credentials: unknown[],
  filters: Filter[] | undefined,
): EbsGetVolumesBatch[] {
  const batches: EbsGetVolumesBatch[] = [];
  const baseFilters = filters ?? [];

  if (filterByARNs) {
    const arns = convertToARNArrayWithValidation(
      filterProperty['arns'] as unknown as string[],
    );
    const groupedARNs = groupARNsByRegion(arns);

    for (const region in groupedARNs) {
      const arnsForRegion = groupedARNs[region];
      const volumeIdFilter: Filter = {
        Name: 'volume-id',
        Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
      };
      for (const creds of credentials) {
        batches.push({
          creds,
          regions: [region] as [string, ...string[]],
          fetchFilters: [...baseFilters, volumeIdFilter],
        });
      }
    }
  } else {
    const regions = convertToRegionsArrayWithValidation(
      filterProperty['regions'],
    );
    for (const creds of credentials) {
      batches.push({
        creds,
        regions,
        fetchFilters: baseFilters,
      });
    }
  }

  return batches;
}

function getFilters(context: any): Filter[] {
  const filters: Filter[] = [];

  if (context.propsValue.shouldQueryOnlyUnattached) {
    filters.push({ Name: 'status', Values: ['available'] });
  }

  if (context.propsValue.volumeTypes && context.propsValue.volumeTypes.length) {
    filters.push({
      Name: 'volume-type',
      Values: context.propsValue.volumeTypes,
    });
  }

  if (filters.length) {
    return filters;
  }

  return [];
}
