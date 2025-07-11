type AssetType =
  | 'AWS_EC2'
  | 'AWS_RDS'
  | 'AWS_S3'
  | 'AWS_OPEN_SEARCH'
  | 'AWS_EBS'
  | 'AWS_ELASTICACHE'
  | 'AWS_DYNAMO_DB'
  | 'AWS_REDSHIFT'
  | 'AZURE_VM'
  | 'AZURE_SQL_DTU'
  | 'AZURE_SQL_VCORE'
  | 'KUBERNETES_CONTAINER';

export const ASSET_CONFIGS = {
  AWS_EC2: {
    label: 'EC2 Rightsizing',
    efficiencyTarget: 'crn:0:rightsizing/AWS_EC2_EfficiencyTarget:system_avg',
    mandatoryFields: ['aws_account_id'],
    targetAsset: `
      ... on EC2Instance {
        id awsInstanceId name provisionedStorageInGb state
        account { ... on AwsAccount { accountId name } }
        instanceType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB networkBandwidthInGbps } }
      }`,
    options: `
      ... on EC2InstanceRecommendedOption {
        bestFit projectedMonthlyPrice projectedMonthlySavings
        instanceType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB networkBandwidthInGbps } }
      }`,
  },
  AWS_RDS: {
    label: 'RDS Rightsizing',
    efficiencyTarget: 'crn:0:rightsizing/AWS_RDS_EfficiencyTarget:system_avg',
    mandatoryFields: ['aws_account_id'],
    targetAsset: `
      ... on RDSInstance {
        id awsInstanceId name state dbEngine dbEngineVersion licenseModel deploymentOption
        account { ... on AwsAccount { accountId name } }
        instanceType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB networkBandwidthInGbps } }
      }`,
    options: `
      ... on RDSInstanceRecommendedOption {
        bestFit projectedMonthlySavings projectedMonthlyPrice
        instanceType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB networkBandwidthInGbps } }
      }`,
  },
  AWS_S3: {
    label: 'S3 Rightsizing',
    efficiencyTarget: 'crn:0:rightsizing/AWS_S3_EfficiencyTarget:system',
    mandatoryFields: [],
    targetAsset: `
      ... on S3Bucket {
        id name state storageClass region
        account { ... on AwsAccount { accountId name } }
      }`,
    options: `
      ... on S3BucketRecommendedOption {
        bestFit projectedCost storageClass projectedSavingsByCost
      }`,
  },
  AWS_OPEN_SEARCH: {
    label: 'OpenSearch Rightsizing',
    efficiencyTarget:
      'crn:0:rightsizing/AWS_OPEN_SEARCH_EfficiencyTarget:system_max',
    mandatoryFields: ['aws_account_id'],
    targetAsset: `
      ... on OpenSearchInstance {
        id domainId domainName instanceCount nodeType version state
        account { ... on AwsAccount { accountId name } }
        instanceType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB } }
      }`,
    options: `
      ... on OpenSearchInstanceRecommendedOption {
        bestFit projectedMonthlyPrice projectedMonthlySavings
        instanceType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB } }
      }`,
  },
  AWS_EBS: {
    label: 'EBS Volume Rightsizing',
    efficiencyTarget: 'crn:0:rightsizing/AWS_EBS_EfficiencyTarget:system_avg',
    mandatoryFields: ['aws_account_id'],
    targetAsset: `
      ... on EBSVolume {
        id volumeId name awsInstanceNames volumeType state
        provisionedThroughput throughputUnit provisionedIOPS provisionedStorageInGB
        account { ... on AwsAccount { accountId name } }
      }`,
    options: `
      ... on EBSVolumeRecommendedOption {
        bestFit projectedMonthlyPrice projectedCost name
        provisionedThroughput throughputUnit provisionedIOPS provisionedStorageInGB
      }`,
  },
  AWS_ELASTICACHE: {
    label: 'ElastiCache Rightsizing',
    efficiencyTarget:
      'crn:0:rightsizing/AWS_ELASTICACHE_EfficiencyTarget:system_max',
    mandatoryFields: ['aws_account_id'],
    targetAsset: `
      ... on ElastiCacheCluster {
        id clusterName engine engineVersion location nodeCount nodeIds state
        account { ... on AwsAccount { accountId name } }
        nodeType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB } }
      }`,
    options: `
      ... on ElastiCacheClusterRecommendedOption {
        bestFit projectedMonthlyPrice projectedMonthlySavings
        instanceType { ... on AWSInstanceType { name vCpu memoryInGB storageType storageInGB } }
      }`,
  },
  AWS_DYNAMO_DB: {
    label: 'DynamoDB Rightsizing',
    efficiencyTarget:
      'crn:0:rightsizing/AWS_DYNAMO_DB_EfficiencyTarget:system_avg',
    mandatoryFields: ['aws_account_id'],
    targetAsset: `
      ... on DynamoDBTable {
        id tableName awsTableId tableType provisionedReadCapacityUnits provisionedWriteCapacityUnits
        account { ... on AwsAccount { accountId name } }
        usages { name value unit }
        availabilityZone { ... on AWSAvailabilityZone { name } }
      }`,
    options: `
      ... on DynamoDBTableRecommendedOption {
        projectedMonthlyPrice projectedMonthlySavings
        recommended { name lowerValue upperValue unit }
      }`,
  },
  AWS_REDSHIFT: {
    label: 'Redshift Rightsizing',
    efficiencyTarget:
      'crn:0:rightsizing/AWS_REDSHIFT_EfficiencyTarget:system_avg',
    mandatoryFields: ['aws_account_id'],
    targetAsset: `
      ... on RedshiftCluster {
        id clusterIdentifier databaseName numberOfNodes state
        account { ... on AwsAccount { accountId name } }
        instanceType { ... on AWSInstanceType { name vCpu } }
      }`,
    options: `
      ... on RedshiftInstanceRecommendedOption {
        bestFit projectedMonthlyPrice projectedMonthlySavings
        instanceType { ... on AWSInstanceType { name vCpu } }
      }`,
  },
  AZURE_VM: {
    label: 'Azure VM Rightsizing',
    efficiencyTarget: 'crn:0:rightsizing/AZURE_VM_EfficiencyTarget:system_avg',
    mandatoryFields: ['azure_subscription_id'],
    targetAsset: `
      ... on AzureVmInstance {
        id azureInstanceId name provisionedStorageInGb
        subscription { ... on AzureSubscription { accountId name } }
        instanceType { ... on AzureInstanceType { name vCpu memoryInGB serviceType storageInGB } }
      }`,
    options: `
      ... on AzureVmInstanceRecommendedOption {
        bestFit projectedMonthlyPrice
        instanceType { ... on AzureInstanceType { name vCpu memoryInGB serviceType storageInGB } }
      }`,
  },
  AZURE_SQL_DTU: {
    label: 'Azure SQL Database (DTU) Rightsizing',
    efficiencyTarget:
      'crn:0:rightsizing/AZURE_SQL_DTU_EfficiencyTarget:system_avg',
    mandatoryFields: ['azure_subscription_id'],
    targetAsset: `
      ... on AzureSqlDb {
        id dbName purchasingModel state status
        subscription { ... on AzureSubscription { name } }
        availabilityZone { ... on AzureAvailabilityZone { name } }
        azureSqlInstanceType { ... on AzureSqlInstanceTypeDtu { name dtu serviceTier storageInGb } }
      }`,
    options: `
      ... on AzureSqlDbInstanceRecommendedOption {
        bestFit projectedMonthlyPrice projectedMonthlySavings
        azureSqlInstanceType { ... on AzureSqlInstanceTypeDtu { name serviceTier storageInGb dtu } }
      }`,
  },
  AZURE_SQL_VCORE: {
    label: 'Azure SQL Database (vCore) Rightsizing',
    efficiencyTarget:
      'crn:0:rightsizing/AZURE_SQL_VCORE_EfficiencyTarget:system_avg',
    mandatoryFields: ['azure_subscription_id'],
    targetAsset: `
      ... on AzureSqlDb {
        id dbName purchasingModel state status
        subscription { ... on AzureSubscription { name } }
        availabilityZone { ... on AzureAvailabilityZone { name } }
        azureSqlInstanceType { ... on AzureSqlInstanceTypeVCore { name vCpu serviceTier hardwareType } }
      }`,
    options: `
      ... on AzureSqlDbInstanceRecommendedOption {
        bestFit projectedMonthlyPrice projectedMonthlySavings
        azureSqlInstanceType { ... on AzureSqlInstanceTypeVCore { name serviceTier hardwareType vCpu } }
      }`,
  },
  KUBERNETES_CONTAINER: {
    label: 'Kubernetes Container Rightsizing',
    efficiencyTarget:
      'crn:0:rightsizing/KUBERNETES_CONTAINER_EfficiencyTarget:system_avg',
    mandatoryFields: ['cloud_provider'],
    targetAsset: `
      ... on KubernetesContainer {
        id state containerName
        cluster { clusterId clusterName }
        workload { workloadId workloadName type }
        namespace { namespaceId namespaceName }
        usages { name value unit }
        requests { name value unit }
        limits { name value unit }
      }`,
    options: `
      ... on KubernetesContainerRecommendedOption {
        recommended { name lowerValue upperValue unit }
      }`,
  },
} as const;

// function buildProcessingFlags(
//   assetType: AssetType,
// ): { key: string; value: string }[] {
//   const flags: { key: string; value: string }[] = [];

//   const burstableTypes: AssetType[] = [
//     'AWS_EC2',
//     'AWS_RDS',
//     'AWS_ELASTICACHE',
//     'AWS_REDSHIFT',
//     'AZURE_VM',
//   ];
//   if (burstableTypes.includes(assetType)) {
//     flags.push({ key: 'recommendBurstable', value: 'true' });
//   }

//   return flags;
// }

function generateRightsizingQuery(assetType: AssetType): string {
  const config = ASSET_CONFIGS[assetType];

  return `
    query rightsizingRecommendations(
      $requestInput: RightsizingRecommendationRequestInput!
      $after: String
      $first: Int
      $sortRules: [SortRule!]
    ) {
      rightsizingRecommendations(
        requestInput: $requestInput
        after: $after
        first: $first
        sortRules: $sortRules
      ) {
        edges {
          node {
            targetAsset {
              ${config.targetAsset}
              __typename
            }
            currentMetrics {
              metricName aggregation value status type unit __typename
            }
            currentUtilizationStatus
            options {
              ${config.options}
              __typename
            }
            currentMonthlyPrice projectedMonthlyPrice projectedMonthlySavings
            currentCost projectedCost projectedSavingsByCost
            terminateRecommendation
            __typename
          }
          __typename
        }
        utilizationStatusSummary {
          underTarget goodFit overTarget unknown notEnoughData undeterminedFit notApplicable __typename
        }
        pageInfo {
          endCursor hasNextPage hasPreviousPage startCursor __typename
        }
        totalCount
        __typename
      }
    }`;
}

function generateQueryVariables(
  assetType: AssetType,
  mandatoryFields: Record<string, string[]>,
  evaluationDuration: string,
  options: {
    returnAllInstances?: boolean;
    first?: number;
    after?: string;
  } = {},
): Record<string, any> {
  const config = ASSET_CONFIGS[assetType];

  const requestInput: Record<string, any> = {
    assetType,
    efficiencyTarget: config.efficiencyTarget,
    evaluationDuration,
    returnAllInstances: options.returnAllInstances ?? false,
  };

  const filterCriteria = Object.entries(mandatoryFields).map(
    ([field, values]) => ({
      name: field,
      values,
    }),
  );

  if (filterCriteria.length > 0) {
    requestInput['filterOptions'] = { otherCriteria: filterCriteria };
  }

  const variables: Record<string, any> = {
    requestInput,
    sortRules: [{ field: 'projectedMonthlySavings', direction: 'DESC' }],
    first: options.first,
    after: options.after,
  };

  return variables;
}

export function generateQuery(
  assetType: AssetType,
  mandatoryFields: Record<string, string[]>,
  evaluationDuration: string,
  options: {
    returnAllInstances?: boolean;
    first?: number;
    after?: string;
  } = {},
): { query: string; variables: Record<string, any> } {
  return {
    query: generateRightsizingQuery(assetType),
    variables: generateQueryVariables(
      assetType,
      mandatoryFields,
      evaluationDuration,
      options,
    ),
  };
}
