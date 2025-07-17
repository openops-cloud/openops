import { Property } from '@openops/blocks-framework';

export function getPredefinedRecommendationsDropdownProperty() {
  return Property.StaticMultiSelectDropdown({
    displayName: 'Recommendation',
    description: 'The type of recommendations to fetch',
    options: {
      disabled: false,
      options: recommendationTypes.map((type: any) => ({
        label: type.label,
        value: { filters: type.filters },
      })),
    },
    required: false,
  });
}

const recommendationTypes = [
  {
    label: 'AMI Orphaned Snapshot',
    filters: { type_id: ['ami-orphaned-snapshot'] },
  },
  {
    label: 'AWS Backup Outdated Snapshot',
    filters: { type_id: ['backup-outdated-snapshot'] },
  },
  {
    label: 'Duplicate CloudTrail',
    filters: { type_id: ['cloudtrail-duplicate-trails'] },
  },
  {
    label: 'CloudWatch Logs Class Change',
    filters: { type_id: ['cloudwatch-logs-class-change'] },
  },
  {
    label: 'DocumentDB Idle',
    filters: { type_id: ['documentdb-util-low'] },
  },
  {
    label: 'DynamoDB Idle',
    filters: { type_id: ['dynamodb-idle'] },
  },
  {
    label: 'EBS Outdated Snapshot',
    filters: { type_id: ['ebs-outdated-snapshot'] },
  },
  {
    label: 'EBS Type Change',
    filters: { type_id: ['ebs-type-change'] },
  },
  {
    label: 'EBS Unattached',
    filters: { type_id: ['ebs-unattached'] },
  },
  {
    label: 'EBS Generation Upgrade',
    filters: { type_id: ['ebs-upgrade'] },
  },
  {
    label: 'EC2 Idle',
    filters: { type_id: ['ec2-idle'] },
  },
  {
    label: 'EC2 Rightsizing',
    filters: { type_id: ['ec2-low-cpu-usage'] },
  },
  {
    label: 'Compute Savings Plan',
    filters: { type_id: ['ec2-savings-plans'] },
  },
  {
    label: 'EC2 Stopped Instance',
    filters: { type_id: ['ec2-stopped-instance'] },
  },
  {
    label: 'Data Transfer between availability zones',
    filters: { type_id: ['ec2-udt'] },
  },
  {
    label: 'ECS Fargate Rightsizing',
    filters: { type_id: ['ecs-fargate'] },
  },
  {
    label: 'EKS Extended Support',
    filters: { type_id: ['eks-extended-support'] },
  },
  {
    label: 'ElastiCache Reserved Instance',
    filters: { type_id: ['elasticache-ri'] },
  },
  {
    label: 'ElastiCache Idle',
    filters: { type_id: ['elasticache-util-low'] },
  },
  {
    label: 'ElasticSearch Idle',
    filters: { type_id: ['es-util-low'] },
  },
  {
    label: 'Load Balancer Idle',
    filters: { type_id: ['idle-load-balancer'] },
  },
  {
    label: 'IP migration v4 to v6',
    filters: { type_id: ['ip-public-ipv4'] },
  },
  {
    label: 'IP Unattached',
    filters: { type_id: ['ip-unattached'] },
  },
  {
    label: 'K8s Workload Rightsizing',
    filters: { type_id: ['k8s-workload-rightsizing'] },
  },
  {
    label: 'Kinesis Idle',
    filters: { type_id: ['kinesis-util-low'] },
  },
  {
    label: 'Disabled KMS',
    filters: { type_id: ['kms-idle'] },
  },
  {
    label: 'Old KMS',
    filters: { type_id: ['kms-old'] },
  },
  {
    label: 'NAT Gateway Idle',
    filters: { type_id: ['nat-gateway-util-low'] },
  },
  {
    label: 'Neptune DB Idle',
    filters: { type_id: ['neptune-util-low'] },
  },
  {
    label: 'OpenSearch Extended Support',
    filters: { type_id: ['opensearch-extended-support'] },
  },
  {
    label: 'OpenSearch Reserved Instance',
    filters: { type_id: ['opensearch-ri'] },
  },
  {
    label: 'Operation System',
    filters: { type_id: ['operation-system'] },
  },
  {
    label: 'RDS Rightsizing',
    filters: { type_id: ['rds-class-change'] },
  },
  {
    label: 'RDS Extended Support',
    filters: { type_id: ['rds-extended-support'] },
  },
  {
    label: 'RDS Instance Idle',
    filters: { type_id: ['rds-idle'] },
  },
  {
    label: 'RDS Provisioned IOPS',
    filters: { type_id: ['rds-iops-change'] },
  },
  {
    label: 'RDS Aurora I/O Optimized Configuration',
    filters: { type_id: ['rds-iops-optimized'] },
  },
  {
    label: 'RDS Reserved Instance',
    filters: { type_id: ['rds-ri'] },
  },
  {
    label: 'RDS Storage Type Change',
    filters: { type_id: ['rds-storage-type-change'] },
  },
  {
    label: 'RDS Generation Upgrade',
    filters: { type_id: ['rds-version-upgrade'] },
  },
  {
    label: 'Redshift Reserved Instance',
    filters: { type_id: ['redshift-ri'] },
  },
  {
    label: 'Redshift Idle',
    filters: { type_id: ['redshift-util-low'] },
  },
  {
    label: 'Region Migration',
    filters: { type_id: ['region-migration'] },
  },
  {
    label: 'S3 Inactive',
    filters: { type_id: ['s3-idle'] },
  },
  {
    label: 'S3 Multipart upload',
    filters: { type_id: ['s3-multipart-upload'] },
  },
  {
    label: 'S3 Storage Class',
    filters: { type_id: ['s3-storage-class'] },
  },
  {
    label: 'S3 Versioning',
    filters: { type_id: ['s3-versioning'] },
  },
  {
    label: 'Unused Secrets',
    filters: { type_id: ['unused-secrets'] },
  },
  {
    label: 'EC2 Generation Upgrade',
    filters: { type_id: ['version-upgrade'] },
  },
  {
    label: 'VPC Endpoint Idle',
    filters: { type_id: ['vpc-endpoint-idle'] },
  },
  {
    label: 'App Service Reserved Capacity',
    filters: { type_id: ['azure-app-service-reserved-capacity'] },
  },
  {
    label: 'CosmosDB Reserved Capacity',
    filters: { type_id: ['azure-cosmos-db-reserved-capacity'] },
  },
  {
    label: 'CosmosDB Rightsizing',
    filters: { type_id: ['azure-cosmos-db-right-sizing'] },
  },
  {
    label: 'CosmosDB Idle',
    filters: { type_id: ['azure-cosmos-idle'] },
  },
  {
    label: 'Data Explorer Reserved Capacity',
    filters: { type_id: ['azure-data-explorer-reserved-capacity'] },
  },
  {
    label: 'DataBase Reserved Instance',
    filters: { type_id: ['azure-db-ri'] },
  },
  {
    label: 'Disk Type Change',
    filters: { type_id: ['azure-disk-type-change'] },
  },
  {
    label: 'Disk Unattached',
    filters: { type_id: ['azure-disk-unattached'] },
  },
  {
    label: 'Example',
    filters: { type_id: ['azure-example'] },
  },
  {
    label: 'Load Balancer Idle',
    filters: { type_id: ['azure-idle-load-balancer'] },
  },
  {
    label: 'IP Unattached',
    filters: { type_id: ['azure-ip-unattached'] },
  },
  {
    label: 'K8s Workload Rightsizing',
    filters: { type_id: ['azure-k8s-workload-rightsizing'] },
  },
  {
    label: 'Kusto Unused Data',
    filters: { type_id: ['azure-kusto-unused-data'] },
  },
  {
    label: 'MariaDB Idle',
    filters: { type_id: ['azure-maria-idle'] },
  },
  {
    label: 'MySQL Idle',
    filters: { type_id: ['azure-mysql-idle'] },
  },
  {
    label: 'MySQL Reserved Capacity',
    filters: { type_id: ['azure-mysql-reserved-capacity'] },
  },
  {
    label: 'Snapshot Outdated',
    filters: { type_id: ['azure-outdated-snapshot'] },
  },
  {
    label: 'PostgresSQL Idle',
    filters: { type_id: ['azure-postgres-idle'] },
  },
  {
    label: 'PostgreSQL Reserved Capacity',
    filters: { type_id: ['azure-postgresql-reserved-capacity'] },
  },
  {
    label: 'Redis Reserved Capacity',
    filters: { type_id: ['azure-redis-reserved-capacity'] },
  },
  {
    label: 'Snapshot Migration',
    filters: { type_id: ['azure-snapshot-migration'] },
  },
  {
    label: 'SQL Data Warehouse Reserved Capacity',
    filters: { type_id: ['azure-sql-data-warehouse-reserved-capacity'] },
  },
  {
    label: 'SQL Idle',
    filters: { type_id: ['azure-sql-idle'] },
  },
  {
    label: 'SQL Reserved Capacity',
    filters: { type_id: ['azure-sql-reserved-capacity'] },
  },
  {
    label: 'Azure SQL Database Rightsizing',
    filters: { type_id: ['azure-sql-rightsizing'] },
  },
  {
    label: 'Virtual Machine Idle',
    filters: { type_id: ['azure-vm-idle'] },
  },
  {
    label: 'Virtual Machine Reserved Instance',
    filters: { type_id: ['azure-vm-ri'] },
  },
  {
    label: 'Virtual Machine Rightsizing',
    filters: { type_id: ['azure-vm-rightsizing'] },
  },
  {
    label: 'Compute Saving Plans',
    filters: { type_id: ['azure-vm-sp'] },
  },
  {
    label: 'Virtual Machine Stopped',
    filters: { type_id: ['azure-vm-stopped'] },
  },
  {
    label: 'Disk Unattached',
    filters: { type_id: ['gcp-disk-unattached'] },
  },
  {
    label: 'Example',
    filters: { type_id: ['gcp-example'] },
  },
  {
    label: 'IP Idle',
    filters: { type_id: ['gcp-ip-idle'] },
  },
  {
    label: 'Commitment Usage Discount',
    filters: { type_id: ['gcp-usage-commitment'] },
  },
  {
    label: 'Virtual Machine Idle',
    filters: { type_id: ['gcp-vm-idle'] },
  },
  {
    label: 'Virtual Machine Rightsizing',
    filters: { type_id: ['gcp-vm-rightsizing'] },
  },
  {
    label: 'Virtual Machine Stopped',
    filters: { type_id: ['gcp-vm-stopped'] },
  },
];
