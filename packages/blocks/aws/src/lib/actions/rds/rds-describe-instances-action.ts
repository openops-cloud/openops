import { Filter } from '@aws-sdk/client-rds';
import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  AwsTag,
  convertToARNArrayWithValidation,
  convertToRegionsArrayWithValidation,
  describeRdsInstances,
  filterByArnsOrRegionsProperties,
  filterTags,
  filterTagsProperties,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsListFromAuth,
  groupARNsByRegion,
  parseArn,
} from '@openops/common';

export const rdsGetInstancesAction = createAction({
  auth: amazonAuth,
  name: 'rds_describe_instances',
  description: 'Get RDS instances that match the given criteria',
  displayName: 'RDS Get Instances',
  IsWriteAction: false,
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
  },
  async run(context) {
    const { accounts, filterByARNs, filterProperty, tags, condition } =
      context.propsValue;
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
        const instanceIdFilter = {
          Name: 'db-instance-id',
          Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
        };
        promises.push(
          ...credentials.map((credentials) =>
            describeRdsInstances(
              credentials,
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
        ...credentials.map((credentials) =>
          describeRdsInstances(credentials, regions, filters),
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
