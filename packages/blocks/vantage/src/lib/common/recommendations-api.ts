import { HttpMethod } from '@openops/blocks-common';
import { getEnumValues } from './get-enum-values';
import { makeRequest } from './make-request';

export async function getRecommendations(
  auth: string,
  category: string | undefined,
  accountId?: string,
  limit?: number,
): Promise<any[]> {
  const queryParams: Record<string, string> =
    category && category.length > 0 ? { category: category } : {};

  if (limit) {
    queryParams['limit'] = limit.toString();
  }

  if (accountId) {
    queryParams['provider_account_id'] = accountId;
  }

  return await makeRequest({
    endpoint: `/recommendations`,
    method: HttpMethod.GET,
    auth,
    queryParams,
  });
}

export async function getCategories(): Promise<
  { label: string; value: string }[]
> {
  const categories: string[] = await getEnumValues(
    '/recommendations',
    'category',
  );
  const mapped = categories.map((cat: string) => {
    const known = knownCategories.find((k) => k.value === cat);
    return {
      label: known ? known.label : cat,
      value: cat,
    };
  });

  mapped.sort((a, b) => a.label.localeCompare(b.label));

  return mapped;
}

const knownCategories = [
  { label: 'AWS EBS: GP2 to GP3 Upgrade', value: 'ebs_gp2_to_gp3' },
  { label: 'AWS EBS: Unattached Volume', value: 'ebs_unattached_volume' },
  {
    label: 'AWS ElastiCache: Reserved Instances',
    value: 'elasticache_reserved_instances',
  },
  {
    label: 'AWS Elasticsearch: Reserved Instances',
    value: 'elastic_search_reserved_instances',
  },
  { label: 'AWS RDS: Reserved Instances', value: 'rds_reserved_instances' },
  {
    label: 'AWS Redshift: Reserved Instances',
    value: 'redshift_reserved_instances',
  },
  {
    label: 'AWS EC2: Generational Upgrades',
    value: 'ec2_generational_upgrades',
  },
  {
    label: 'AWS RDS: Generational Upgrades',
    value: 'rds_generational_upgrades',
  },
  {
    label: 'AWS Elasticsearch: Generational Upgrades',
    value: 'es_generational_upgrades',
  },
  {
    label: 'AWS CloudWatch: Log Retention Policy',
    value: 'cw_log_retention_policy',
  },
  { label: 'AWS WorkSpaces: Unused', value: 'workspace_unused' },
  { label: 'AWS WorkSpaces: Stranded', value: 'workspace_stranded' },
  {
    label: 'AWS CloudFront: Cloudflare Integration',
    value: 'cloudfront_cloudflare',
  },
  { label: 'AWS S3: Cloudflare Integration', value: 's3_cloudflare' },
  { label: 'AWS EC2: Unattached IP Addresses', value: 'ip_unattached' },
  {
    label: 'AWS S3: Bucket Intelligent Tiering',
    value: 's3_bucket_intelligent_tiering',
  },
  { label: 'AWS Savings Plan', value: 'savings_plan' },
  {
    label: 'Unused Financial Commitments',
    value: 'unused_financial_commitments',
  },
  {
    label: 'Datadog Financial Commitments',
    value: 'datadog_financial_commitments',
  },
  {
    label: 'Azure Compute: Reserved Instances',
    value: 'az_compute_reserved_instances',
  },
  {
    label: 'Azure Compute: Reserved Instances (Cosmos)',
    value: 'az_compute_reserved_instances_cosmos',
  },
  {
    label: 'Azure Compute: Reserved Instances (SQL)',
    value: 'az_compute_reserved_instances_sql',
  },
  {
    label: 'Azure Compute: Reserved Instances (App Service)',
    value: 'az_compute_reserved_instances_app_service',
  },
  { label: 'Azure Disks: Unattached', value: 'az_disks_unattached' },
  {
    label: 'AWS DynamoDB: Reserved Capacity Recommender',
    value: 'dynamodb_reserved_capacity_recommender',
  },
  {
    label: 'AWS EC2: Rightsizing Recommender',
    value: 'ec2_rightsizing_recommender',
  },
  {
    label: 'AWS Kubernetes: Rightsizing Recommender',
    value: 'kubernetes_recommender',
  },
  {
    label: 'GCP Compute: Rightsizing Recommender',
    value: 'gcp_compute_rightsizing_recommender',
  },
  {
    label: 'GCP Compute: Commitment Recommender',
    value: 'gcp_compute_commitment_recommender',
  },
  { label: 'AWS EC2: Snapshot Recommender', value: 'ec2_snapshot_recommender' },
  {
    label: 'AWS EBS: Compute Optimizer Recommender',
    value: 'ebs_compute_optimizer_recommender',
  },
  {
    label: 'AWS Lambda: Compute Optimizer Recommender',
    value: 'lambda_compute_optimizer_recommender',
  },
  {
    label: 'AWS ECS: Compute Optimizer Recommender',
    value: 'ecs_compute_optimizer_recommender',
  },
  {
    label: 'AWS Idle Resources: Compute Optimizer Recommender',
    value: 'idle_compute_optimizer_recommender',
  },
  {
    label: 'AWS RDS: Compute Optimizer Recommender',
    value: 'rds_compute_optimizer_recommender',
  },
  {
    label: 'AWS EC2: Compute Optimizer Recommender',
    value: 'ec2_compute_optimizer_recommender',
  },
  {
    label: 'Azure: Rightsizing Recommender',
    value: 'azure_rightsizing_recommender',
  },
  {
    label: 'Azure Compute: Savings Recommender',
    value: 'azure_compute_savings_recommender',
  },
  {
    label: 'Azure Blob Storage: Reserved Instances Recommender',
    value: 'azure_blob_storage_reserved_instances_recommender',
  },
  {
    label: 'Azure SQL Database (PaaS): Reserved Instances Recommender',
    value: 'azure_sql_paas_db_reserved_instances_recommender',
  },
  {
    label: 'Azure Files: Reserved Instances Recommender',
    value: 'azure_files_reserved_instances_recommender',
  },
  {
    label: 'AWS EKS: In Extended Support Window',
    value: 'eks_in_extended_support_window',
  },
  {
    label: 'AWS EKS: Approaching Extended Support Window',
    value: 'eks_approaching_extended_support_window',
  },
];
