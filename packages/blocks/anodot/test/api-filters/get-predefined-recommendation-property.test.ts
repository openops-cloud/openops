import { getPredefinedRecommendationsDropdownProperty } from '../../src/lib/api-filters/get-predefined-recommendation-property';

describe('getPredefinedRecommendationsDropdownProperty', () => {
  test('should return expected property', async () => {
    const result = getPredefinedRecommendationsDropdownProperty();

    expect(result).toMatchObject({
      required: false,
      displayName: 'Recommendation',
      description: 'The type of recommendations to fetch',
      type: 'STATIC_MULTI_SELECT_DROPDOWN',
      options: {
        options: [
          {
            label: 'AMI Orphaned Snapshot',
            value: 'ami-orphaned-snapshot',
          },
          {
            label: 'AWS Backup Outdated Snapshot',
            value: 'backup-outdated-snapshot',
          },
          {
            label: 'Duplicate CloudTrail',
            value: 'cloudtrail-duplicate-trails',
          },
          {
            label: 'CloudWatch Logs Class Change',
            value: 'cloudwatch-logs-class-change',
          },
          {
            label: 'DocumentDB Idle',
            value: 'documentdb-util-low',
          },
          {
            label: 'DynamoDB Idle',
            value: 'dynamodb-idle',
          },
          {
            label: 'EBS Outdated Snapshot',
            value: 'ebs-outdated-snapshot',
          },
          {
            label: 'EBS Type Change',
            value: 'ebs-type-change',
          },
          {
            label: 'EBS Unattached',
            value: 'ebs-unattached',
          },
          {
            label: 'EBS Generation Upgrade',
            value: 'ebs-upgrade',
          },
          {
            label: 'EC2 Idle',
            value: 'ec2-idle',
          },
          {
            label: 'EC2 Rightsizing',
            value: 'ec2-low-cpu-usage',
          },
          {
            label: 'Compute Savings Plan',
            value: 'ec2-savings-plans',
          },
          {
            label: 'EC2 Stopped Instance',
            value: 'ec2-stopped-instance',
          },
          {
            label: 'Data Transfer between availability zones',
            value: 'ec2-udt',
          },
          {
            label: 'ECS Fargate Rightsizing',
            value: 'ecs-fargate',
          },
          {
            label: 'EKS Extended Support',
            value: 'eks-extended-support',
          },
          {
            label: 'ElastiCache Reserved Instance',
            value: 'elasticache-ri',
          },
          {
            label: 'ElastiCache Idle',
            value: 'elasticache-util-low',
          },
          {
            label: 'ElasticSearch Idle',
            value: 'es-util-low',
          },
          {
            label: 'Load Balancer Idle',
            value: 'idle-load-balancer',
          },
          {
            label: 'IP migration v4 to v6',
            value: 'ip-public-ipv4',
          },
          {
            label: 'IP Unattached',
            value: 'ip-unattached',
          },
          {
            label: 'K8s Workload Rightsizing',
            value: 'k8s-workload-rightsizing',
          },
          {
            label: 'Kinesis Idle',
            value: 'kinesis-util-low',
          },
          {
            label: 'Disabled KMS',
            value: 'kms-idle',
          },
          {
            label: 'Old KMS',
            value: 'kms-old',
          },
          {
            label: 'NAT Gateway Idle',
            value: 'nat-gateway-util-low',
          },
          {
            label: 'Neptune DB Idle',
            value: 'neptune-util-low',
          },
          {
            label: 'OpenSearch Extended Support',
            value: 'opensearch-extended-support',
          },
          {
            label: 'OpenSearch Reserved Instance',
            value: 'opensearch-ri',
          },
          {
            label: 'Operation System',
            value: 'operation-system',
          },
          {
            label: 'RDS Rightsizing',
            value: 'rds-class-change',
          },
          {
            label: 'RDS Extended Support',
            value: 'rds-extended-support',
          },
          {
            label: 'RDS Instance Idle',
            value: 'rds-idle',
          },
          {
            label: 'RDS Provisioned IOPS',
            value: 'rds-iops-change',
          },
          {
            label: 'RDS Aurora I/O Optimized Configuration',
            value: 'rds-iops-optimized',
          },
          {
            label: 'RDS Reserved Instance',
            value: 'rds-ri',
          },
          {
            label: 'RDS Storage Type Change',
            value: 'rds-storage-type-change',
          },
          {
            label: 'RDS Generation Upgrade',
            value: 'rds-version-upgrade',
          },
          {
            label: 'Redshift Reserved Instance',
            value: 'redshift-ri',
          },
          {
            label: 'Redshift Idle',
            value: 'redshift-util-low',
          },
          {
            label: 'Region Migration',
            value: 'region-migration',
          },
          {
            label: 'S3 Inactive',
            value: 's3-idle',
          },
          {
            label: 'S3 Multipart upload',
            value: 's3-multipart-upload',
          },
          {
            label: 'S3 Storage Class',
            value: 's3-storage-class',
          },
          {
            label: 'S3 Versioning',
            value: 's3-versioning',
          },
          {
            label: 'Unused Secrets',
            value: 'unused-secrets',
          },
          {
            label: 'EC2 Generation Upgrade',
            value: 'version-upgrade',
          },
          {
            label: 'VPC Endpoint Idle',
            value: 'vpc-endpoint-idle',
          },
          {
            label: 'App Service Reserved Capacity',
            value: 'azure-app-service-reserved-capacity',
          },
          {
            label: 'CosmosDB Reserved Capacity',
            value: 'azure-cosmos-db-reserved-capacity',
          },
          {
            label: 'CosmosDB Rightsizing',
            value: 'azure-cosmos-db-right-sizing',
          },
          {
            label: 'CosmosDB Idle',
            value: 'azure-cosmos-idle',
          },
          {
            label: 'Data Explorer Reserved Capacity',
            value: 'azure-data-explorer-reserved-capacity',
          },
          {
            label: 'DataBase Reserved Instance',
            value: 'azure-db-ri',
          },
          {
            label: 'Disk Type Change',
            value: 'azure-disk-type-change',
          },
          {
            label: 'Disk Unattached',
            value: 'azure-disk-unattached',
          },
          {
            label: 'Example',
            value: 'azure-example',
          },
          {
            label: 'Load Balancer Idle',
            value: 'azure-idle-load-balancer',
          },
          {
            label: 'IP Unattached',
            value: 'azure-ip-unattached',
          },
          {
            label: 'K8s Workload Rightsizing',
            value: 'azure-k8s-workload-rightsizing',
          },
          {
            label: 'Kusto Unused Data',
            value: 'azure-kusto-unused-data',
          },
          {
            label: 'MariaDB Idle',
            value: 'azure-maria-idle',
          },
          {
            label: 'MySQL Idle',
            value: 'azure-mysql-idle',
          },
          {
            label: 'MySQL Reserved Capacity',
            value: 'azure-mysql-reserved-capacity',
          },
          {
            label: 'Snapshot Outdated',
            value: 'azure-outdated-snapshot',
          },
          {
            label: 'PostgresSQL Idle',
            value: 'azure-postgres-idle',
          },
          {
            label: 'PostgreSQL Reserved Capacity',
            value: 'azure-postgresql-reserved-capacity',
          },
          {
            label: 'Redis Reserved Capacity',
            value: 'azure-redis-reserved-capacity',
          },
          {
            label: 'Snapshot Migration',
            value: 'azure-snapshot-migration',
          },
          {
            label: 'SQL Data Warehouse Reserved Capacity',
            value: 'azure-sql-data-warehouse-reserved-capacity',
          },
          {
            label: 'SQL Idle',
            value: 'azure-sql-idle',
          },
          {
            label: 'SQL Reserved Capacity',
            value: 'azure-sql-reserved-capacity',
          },
          {
            label: 'Azure SQL Database Rightsizing',
            value: 'azure-sql-rightsizing',
          },
          {
            label: 'Virtual Machine Idle',
            value: 'azure-vm-idle',
          },
          {
            label: 'Virtual Machine Reserved Instance',
            value: 'azure-vm-ri',
          },
          {
            label: 'Virtual Machine Rightsizing',
            value: 'azure-vm-rightsizing',
          },
          {
            label: 'Compute Saving Plans',
            value: 'azure-vm-sp',
          },
          {
            label: 'Virtual Machine Stopped',
            value: 'azure-vm-stopped',
          },
          {
            label: 'Disk Unattached',
            value: 'gcp-disk-unattached',
          },
          {
            label: 'Example',
            value: 'gcp-example',
          },
          {
            label: 'IP Idle',
            value: 'gcp-ip-idle',
          },
          {
            label: 'Commitment Usage Discount',
            value: 'gcp-usage-commitment',
          },
          {
            label: 'Virtual Machine Idle',
            value: 'gcp-vm-idle',
          },
          {
            label: 'Virtual Machine Rightsizing',
            value: 'gcp-vm-rightsizing',
          },
          {
            label: 'Virtual Machine Stopped',
            value: 'gcp-vm-stopped',
          },
        ],
      },
    });
  });
});
