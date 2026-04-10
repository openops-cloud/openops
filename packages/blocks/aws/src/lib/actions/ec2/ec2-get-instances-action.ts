import { _InstanceType, Filter, InstanceStateName } from '@aws-sdk/client-ec2';
import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  AwsTag,
  dryRunCheckBox,
  filterByArnsOrRegionsProperties,
  filterTags,
  filterTagsProperties,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsListFromAuth,
  getEc2Instances,
  getEc2InstancesWithPartialResults,
  groupARNsByRegion,
  parseArn,
} from '@openops/common';
import { convertToStringArrayWithValidation, isEmpty } from '@openops/shared';

const instanceTypeArray = Object.entries(_InstanceType).map(
  ([label, value]) => ({ label, value }),
);

const instanceStateArray = Object.entries(InstanceStateName).map(
  ([label, value]) => ({ label, value }),
);

export const ec2GetInstancesAction = createAction({
  auth: amazonAuth,
  name: 'ec2_get_instances',
  description: 'EC2 Get Instances that match the given criteria',
  displayName: 'EC2 Get Instances',
  isWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    ...filterByArnsOrRegionsProperties(
      'Instance ARNs',
      'Filter by instance arns',
    ),
    instanceTypes: Property.StaticMultiSelectDropdown({
      displayName: 'Instance Types',
      description: 'Query only instances of the selected types',
      required: false,
      options: {
        disabled: false,
        options: instanceTypeArray,
      },
    }),
    instanceStates: Property.StaticMultiSelectDropdown({
      displayName: 'Instance States',
      description: 'Query only instances on the selected states',
      required: false,
      options: {
        disabled: false,
        options: instanceStateArray,
      },
    }),
    ...filterTagsProperties(),
    dryRun: dryRunCheckBox(),
    allowPartialResults: Property.Checkbox({
      displayName: 'Allow partial results',
      description:
        'When enabled, the step returns { results, failedRegions } and continues when some regions fail.',
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
      const filters: Filter[] = getFilters(context);
      const credentials = await getCredentialsListFromAuth(
        context.auth,
        accounts['accounts'],
      );

      const partial = allowPartialResults === true;

      if (partial) {
        const partialPromises = [];
        if (filterByARNs) {
          const arns = convertToStringArrayWithValidation(
            filterProperty['arns'] as unknown as string[],
            'Invalid input for ARNs: input should be a single string or an array of strings',
          );
          const groupedARNs = groupARNsByRegion(arns);

          for (const region in groupedARNs) {
            const arnsForRegion = groupedARNs[region];
            const instanceIdFilter = {
              Name: 'instance-id',
              Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
            };
            partialPromises.push(
              ...credentials.map((creds) =>
                getEc2InstancesWithPartialResults(
                  creds,
                  [region] as [string, ...string[]],
                  dryRun,
                  [...filters, instanceIdFilter],
                ),
              ),
            );
          }
        } else {
          const regions = convertToStringArrayWithValidation(
            filterProperty['regions'],
            'Invalid input for regions: input should be a single string or an array of strings',
          );
          partialPromises.push(
            ...credentials.map((creds) =>
              getEc2InstancesWithPartialResults(
                creds,
                regions as [string, ...string[]],
                dryRun,
                filters,
              ),
            ),
          );
        }

        const partialOutcomes = await Promise.all(partialPromises);
        let instances = partialOutcomes.flatMap((o) => o.results);
        const failedRegions = partialOutcomes.flatMap((o) => o.failedRegions);

        if (tags?.length) {
          instances = instances.filter((instance) =>
            filterTags((instance.Tags as AwsTag[]) ?? [], tags, condition),
          );
        }

        return { results: instances, failedRegions };
      }

      const promises: any[] = [];
      if (filterByARNs) {
        const arns = convertToStringArrayWithValidation(
          filterProperty['arns'] as unknown as string[],
          'Invalid input for ARNs: input should be a single string or an array of strings',
        );
        const groupedARNs = groupARNsByRegion(arns);

        for (const region in groupedARNs) {
          const arnsForRegion = groupedARNs[region];
          const instanceIdFilter = {
            Name: 'instance-id',
            Values: arnsForRegion.map((arn) => parseArn(arn).resourceId),
          };
          promises.push(
            ...credentials.map((creds) =>
              getEc2Instances(
                creds,
                [region] as [string, ...string[]],
                dryRun,
                [...filters, instanceIdFilter],
              ),
            ),
          );
        }
      } else {
        const regions = convertToStringArrayWithValidation(
          filterProperty['regions'],
          'Invalid input for regions: input should be a single string or an array of strings',
        );
        promises.push(
          ...credentials.map((creds) =>
            getEc2Instances(creds, regions, dryRun, filters),
          ),
        );
      }

      const instances = (await Promise.all(promises)).flat();

      if (tags?.length) {
        return instances.filter((instance) =>
          filterTags((instance.Tags as AwsTag[]) ?? [], tags, condition),
        );
      }

      return instances;
    } catch (error) {
      throw new Error(
        'An error occurred while fetching EC2 Instances: ' + error,
      );
    }
  },
});

function getFilters(context: any): Filter[] {
  const filters: Filter[] = [];

  const { instanceTypes, instanceStates } = context.propsValue;

  if (!isEmpty(instanceTypes)) {
    filters.push({
      Name: 'instance-type',
      Values: convertToStringArrayWithValidation(
        instanceTypes,
        'Invalid input for instance types: input should be a single string or an array of strings',
      ),
    });
  }

  if (!isEmpty(instanceStates)) {
    filters.push({
      Name: 'instance-state-name',
      Values: convertToStringArrayWithValidation(
        instanceStates,
        'Invalid input for instance states: input should be a single string or an array of strings',
      ),
    });
  }

  return filters;
}
