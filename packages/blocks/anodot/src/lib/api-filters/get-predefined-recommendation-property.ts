import { Property } from '@openops/blocks-framework';

export function getPredefinedRecommendationsDropdownProperty() {
  return Property.StaticMultiSelectDropdown({
    displayName: 'Recommendation',
    description: 'The type of recommendations to fetch',
    options: {
      disabled: false,
      options: recommendationTypes,
    },
    required: false,
  });
}

const recommendationTypes = [
  {
    label: 'AWS AMI Orphaned Snapshot',
    value: 'ami-orphaned-snapshot',
  },
  {
    label: 'AWS Backup Outdated Snapshot',
    value: 'backup-outdated-snapshot',
  },
  {
    label: 'AWS Duplicate CloudTrail',
    value: 'cloudtrail-duplicate-trails',
  },
  {
    label: 'AWS CloudWatch Logs Class Change',
    value: 'cloudwatch-logs-class-change',
  },
  {
    label: 'AWS DocumentDB Idle',
    value: 'documentdb-util-low',
  },
  {
    label: 'AWS DynamoDB Idle',
    value: 'dynamodb-idle',
  },
  {
    label: 'AWS EBS Outdated Snapshot',
    value: 'ebs-outdated-snapshot',
  },
  {
    label: 'AWS EBS Type Change',
    value: 'ebs-type-change',
  },
  {
    label: 'AWS EBS Unattached',
    value: 'ebs-unattached',
  },
  {
    label: 'AWS EBS Generation Upgrade',
    value: 'ebs-upgrade',
  },
  {
    label: 'AWS EC2 Idle',
    value: 'ec2-idle',
  },
  {
    label: 'AWS EC2 Rightsizing',
    value: 'ec2-low-cpu-usage',
  },
  {
    label: 'AWS Compute Savings Plan',
    value: 'ec2-savings-plans',
  },
  {
    label: 'AWS EC2 Stopped Instance',
    value: 'ec2-stopped-instance',
  },
  {
    label: 'AWS Data Transfer between availability zones',
    value: 'ec2-udt',
  },
  {
    label: 'AWS ECS Fargate Rightsizing',
    value: 'ecs-fargate',
  },
  {
    label: 'AWS EKS Extended Support',
    value: 'eks-extended-support',
  },
  {
    label: 'AWS ElastiCache Reserved Instance',
    value: 'elasticache-ri',
  },
  {
    label: 'AWS ElastiCache Idle',
    value: 'elasticache-util-low',
  },
  {
    label: 'AWS ElasticSearch Idle',
    value: 'es-util-low',
  },
  {
    label: 'AWS Load Balancer Idle',
    value: 'idle-load-balancer',
  },
  {
    label: 'AWS IP migration v4 to v6',
    value: 'ip-public-ipv4',
  },
  {
    label: 'AWS IP Unattached',
    value: 'ip-unattached',
  },
  {
    label: 'AWS K8s Workload Rightsizing',
    value: 'k8s-workload-rightsizing',
  },
  {
    label: 'AWS Kinesis Idle',
    value: 'kinesis-util-low',
  },
  {
    label: 'AWS Disabled KMS',
    value: 'kms-idle',
  },
  {
    label: 'AWS Old KMS',
    value: 'kms-old',
  },
  {
    label: 'AWS NAT Gateway Idle',
    value: 'nat-gateway-util-low',
  },
  {
    label: 'AWS Neptune DB Idle',
    value: 'neptune-util-low',
  },
  {
    label: 'AWS OpenSearch Extended Support',
    value: 'opensearch-extended-support',
  },
  {
    label: 'AWS OpenSearch Reserved Instance',
    value: 'opensearch-ri',
  },
  {
    label: 'AWS Operation System',
    value: 'operation-system',
  },
  {
    label: 'AWS RDS Rightsizing',
    value: 'rds-class-change',
  },
  {
    label: 'AWS RDS Extended Support',
    value: 'rds-extended-support',
  },
  {
    label: 'AWS RDS Instance Idle',
    value: 'rds-idle',
  },
  {
    label: 'AWS RDS Provisioned IOPS',
    value: 'rds-iops-change',
  },
  {
    label: 'AWS RDS Aurora I/O Optimized Configuration',
    value: 'rds-iops-optimized',
  },
  {
    label: 'AWS RDS Reserved Instance',
    value: 'rds-ri',
  },
  {
    label: 'AWS RDS Storage Type Change',
    value: 'rds-storage-type-change',
  },
  {
    label: 'AWS RDS Generation Upgrade',
    value: 'rds-version-upgrade',
  },
  {
    label: 'AWS Redshift Reserved Instance',
    value: 'redshift-ri',
  },
  {
    label: 'AWS Redshift Idle',
    value: 'redshift-util-low',
  },
  {
    label: 'AWS Region Migration',
    value: 'region-migration',
  },
  {
    label: 'AWS S3 Inactive',
    value: 's3-idle',
  },
  {
    label: 'AWS S3 Multipart upload',
    value: 's3-multipart-upload',
  },
  {
    label: 'AWS S3 Storage Class',
    value: 's3-storage-class',
  },
  {
    label: 'AWS S3 Versioning',
    value: 's3-versioning',
  },
  {
    label: 'AWS Unused Secrets',
    value: 'unused-secrets',
  },
  {
    label: 'AWS EC2 Generation Upgrade',
    value: 'version-upgrade',
  },
  {
    label: 'AWS VPC Endpoint Idle',
    value: 'vpc-endpoint-idle',
  },
  {
    label: 'Azure App Service Reserved Capacity',
    value: 'azure-app-service-reserved-capacity',
  },
  {
    label: 'Azure CosmosDB Reserved Capacity',
    value: 'azure-cosmos-db-reserved-capacity',
  },
  {
    label: 'Azure CosmosDB Rightsizing',
    value: 'azure-cosmos-db-right-sizing',
  },
  {
    label: 'Azure CosmosDB Idle',
    value: 'azure-cosmos-idle',
  },
  {
    label: 'Azure Data Explorer Reserved Capacity',
    value: 'azure-data-explorer-reserved-capacity',
  },
  {
    label: 'Azure DataBase Reserved Instance',
    value: 'azure-db-ri',
  },
  {
    label: 'Azure Disk Type Change',
    value: 'azure-disk-type-change',
  },
  {
    label: 'Azure Disk Unattached',
    value: 'azure-disk-unattached',
  },
  {
    label: 'Azure Load Balancer Idle',
    value: 'azure-idle-load-balancer',
  },
  {
    label: 'Azure IP Unattached',
    value: 'azure-ip-unattached',
  },
  {
    label: 'Azure K8s Workload Rightsizing',
    value: 'azure-k8s-workload-rightsizing',
  },
  {
    label: 'Azure Kusto Unused Data',
    value: 'azure-kusto-unused-data',
  },
  {
    label: 'Azure MariaDB Idle',
    value: 'azure-maria-idle',
  },
  {
    label: 'Azure MySQL Idle',
    value: 'azure-mysql-idle',
  },
  {
    label: 'Azure MySQL Reserved Capacity',
    value: 'azure-mysql-reserved-capacity',
  },
  {
    label: 'Azure Snapshot Outdated',
    value: 'azure-outdated-snapshot',
  },
  {
    label: 'Azure PostgresSQL Idle',
    value: 'azure-postgres-idle',
  },
  {
    label: 'Azure PostgreSQL Reserved Capacity',
    value: 'azure-postgresql-reserved-capacity',
  },
  {
    label: 'Azure Redis Reserved Capacity',
    value: 'azure-redis-reserved-capacity',
  },
  {
    label: 'Azure Snapshot Migration',
    value: 'azure-snapshot-migration',
  },
  {
    label: 'Azure SQL Data Warehouse Reserved Capacity',
    value: 'azure-sql-data-warehouse-reserved-capacity',
  },
  {
    label: 'Azure SQL Idle',
    value: 'azure-sql-idle',
  },
  {
    label: 'Azure SQL Reserved Capacity',
    value: 'azure-sql-reserved-capacity',
  },
  {
    label: 'Azure SQL Database Rightsizing',
    value: 'azure-sql-rightsizing',
  },
  {
    label: 'Azure Virtual Machine Idle',
    value: 'azure-vm-idle',
  },
  {
    label: 'Azure Virtual Machine Reserved Instance',
    value: 'azure-vm-ri',
  },
  {
    label: 'Azure Virtual Machine Rightsizing',
    value: 'azure-vm-rightsizing',
  },
  {
    label: 'Azure Compute Saving Plans',
    value: 'azure-vm-sp',
  },
  {
    label: 'Azure Virtual Machine Stopped',
    value: 'azure-vm-stopped',
  },
  {
    label: 'Disk Unattached',
    value: 'gcp-disk-unattached',
  },
  {
    label: 'GCP IP Idle',
    value: 'gcp-ip-idle',
  },
  {
    label: 'GCP Commitment Usage Discount',
    value: 'gcp-usage-commitment',
  },
  {
    label: 'GCP Virtual Machine Idle',
    value: 'gcp-vm-idle',
  },
  {
    label: 'GCP Virtual Machine Rightsizing',
    value: 'gcp-vm-rightsizing',
  },
  {
    label: 'GCP Virtual Machine Stopped',
    value: 'gcp-vm-stopped',
  },
];
