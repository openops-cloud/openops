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
  requireToolApproval: false,
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
          const volumeIdFilter = {
            Name: 'volume-id',
            Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
          };
          promises.push(
            ...credentials.map((credentials) =>
              getEbsVolumes(credentials, [region], dryRun, [
                ...filters,
                volumeIdFilter,
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
            getEbsVolumes(credentials, regions, dryRun, filters),
          ),
        );
      }

      const volumes = (await Promise.all(promises)).flat();

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
