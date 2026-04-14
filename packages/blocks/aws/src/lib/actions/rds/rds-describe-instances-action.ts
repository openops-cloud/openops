import { DBInstance, Filter } from '@aws-sdk/client-rds';
import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  AwsTag,
  convertToARNArrayWithValidation,
  convertToRegionsArrayWithValidation,
  describeRdsInstances,
  describeRdsInstancesAllowPartial,
  filterByArnsOrRegionsProperties,
  filterTags,
  filterTagsProperties,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsListFromAuth,
  groupARNsByRegion,
  parseArn,
  type PartialResult,
} from '@openops/common';

export const rdsGetInstancesAction = createAction({
  auth: amazonAuth,
  name: 'rds_describe_instances',
  description: 'Get RDS instances that match the given criteria',
  displayName: 'RDS Get Instances',
  isWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    ...filterByArnsOrRegionsProperties(
      'Instance ARNs',
      'Filter by instance arns',
    ),
    clusterIds: Property.Array({
      displayName: 'Cluster IDs',
      description: 'Filter by cluster ids',
      required: false,
    }),
    domainIds: Property.Array({
      displayName: 'Active Domain IDs',
      description: 'Filter by domain IDs',
      required: false,
    }),
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
    const {
      accounts,
      filterByARNs,
      filterProperty,
      tags,
      condition,
      allowPartialResults,
    } = context.propsValue;
    const filters: Filter[] = getFilters(context);
    const credentials = await getCredentialsListFromAuth(
      context.auth,
      accounts['accounts'],
    );

    const partial = allowPartialResults === true;

    if (partial) {
      const promises: Promise<PartialResult<DBInstance>>[] = [];
      if (filterByARNs) {
        const arns = convertToARNArrayWithValidation(
          filterProperty['arns'] as unknown as string[],
        );
        const groupedARNs = groupARNsByRegion(arns);

        for (const region in groupedARNs) {
          const arnsForRegion = groupedARNs[region];
          const instanceIdFilter = {
            Name: 'db-instance-id',
            Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
          };
          promises.push(
            ...credentials.map((creds) =>
              describeRdsInstancesAllowPartial(
                creds,
                [region] as [string, ...string[]],
                [...filters, instanceIdFilter],
              ),
            ),
          );
        }
      } else {
        const regions = convertToRegionsArrayWithValidation(
          filterProperty['regions'],
        );
        promises.push(
          ...credentials.map((creds) =>
            describeRdsInstancesAllowPartial(creds, regions, filters),
          ),
        );
      }

      const partialOutcomes = await Promise.all(promises);
      let instances = partialOutcomes.flatMap((o) => o.results);
      const failedRegions = partialOutcomes.flatMap((o) => o.failedRegions);

      if (tags?.length > 0) {
        instances = instances.filter((instance) =>
          filterTags((instance.TagList as AwsTag[]) ?? [], tags, condition),
        );
      }

      return { results: instances, failedRegions };
    }

    const promises: any[] = [];
    if (filterByARNs) {
      const arns = convertToARNArrayWithValidation(
        filterProperty['arns'] as unknown as string[],
      );
      const groupedARNs = groupARNsByRegion(arns);

      for (const region in groupedARNs) {
        const arnsForRegion = groupedARNs[region];
        const instanceIdFilter = {
          Name: 'db-instance-id',
          Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
        };
        promises.push(
          ...credentials.map((creds) =>
            describeRdsInstances(creds, [region] as [string, ...string[]], [
              ...filters,
              instanceIdFilter,
            ]),
          ),
        );
      }
    } else {
      const regions = convertToRegionsArrayWithValidation(
        filterProperty['regions'],
      );
      promises.push(
        ...credentials.map((creds) =>
          describeRdsInstances(creds, regions, filters),
        ),
      );
    }

    const instances = (await Promise.all(promises)).flat();

    if (tags?.length > 0) {
      return instances.filter((instance) =>
        filterTags((instance.TagList as AwsTag[]) ?? [], tags, condition),
      );
    }

    return instances;
  },
});

function getFilters(context: any): Filter[] {
  const filters: Filter[] = [];

  if (
    context.propsValue.clusterIds &&
    context.propsValue.clusterIds.length > 0
  ) {
    filters.push({
      Name: 'db-cluster-id',
      Values: context.propsValue.clusterIds,
    });
  }

  if (context.propsValue.domainIds && context.propsValue.domainIds.length > 0) {
    filters.push({ Name: 'domain', Values: context.propsValue.domainIds });
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
