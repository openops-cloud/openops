import { getPredefinedRecommendationsDropdownProperty } from '../../src/lib/api-filters/get-x-recommendation-property';

describe('getPredefinedRecommendationsDropdownProperty', () => {
  test('should return expected property', async () => {
    const result = getPredefinedRecommendationsDropdownProperty();

    expect(result).toMatchObject({
      required: true,
      displayName: 'Recommendation',
      description: 'The type of recommendations to fetch',
      type: 'STATIC_DROPDOWN',
      options: {
        options: [
          {
            label: 'AMI Orphaned Snapshot',
            value: { filters: { type_id: ['ami-orphaned-snapshot'] } },
          },
          {
            label: 'AWS Backup Outdated Snapshot',
            value: { filters: { type_id: ['backup-outdated-snapshot'] } },
          },
          {
            label: 'Duplicate CloudTrail',
            value: { filters: { type_id: ['cloudtrail-duplicate-trails'] } },
          },
          {
            label: 'CloudWatch Logs Class Change',
            value: { filters: { type_id: ['cloudwatch-logs-class-change'] } },
          },
          {
            label: 'DocumentDB Idle',
            value: { filters: { type_id: ['documentdb-util-low'] } },
          },
          {
            label: 'DynamoDB Idle',
            value: { filters: { type_id: ['dynamodb-idle'] } },
          },
          {
            label: 'EBS Outdated Snapshot',
            value: { filters: { type_id: ['ebs-outdated-snapshot'] } },
          },
          {
            label: 'EBS Type Change',
            value: { filters: { type_id: ['ebs-type-change'] } },
          },
          {
            label: 'EBS Unattached',
            value: { filters: { type_id: ['ebs-unattached'] } },
          },
          {
            label: 'EBS Generation Upgrade',
            value: { filters: { type_id: ['ebs-upgrade'] } },
          },
          {
            label: 'EC2 Idle',
            value: { filters: { type_id: ['ec2-idle'] } },
          },
          {
            label: 'EC2 Rightsizing',
            value: { filters: { type_id: ['ec2-low-cpu-usage'] } },
          },
          {
            label: 'Compute Savings Plan',
            value: { filters: { type_id: ['ec2-savings-plans'] } },
          },
          {
            label: 'EC2 Stopped Instance',
            value: { filters: { type_id: ['ec2-stopped-instance'] } },
          },
          {
            label: 'Data Transfer between availability zones',
            value: { filters: { type_id: ['ec2-udt'] } },
          },
          {
            label: 'ECS Fargate Rightsizing',
            value: { filters: { type_id: ['ecs-fargate'] } },
          },
          {
            label: 'EKS Extended Support',
            value: { filters: { type_id: ['eks-extended-support'] } },
          },
          {
            label: 'ElastiCache Reserved Instance',
            value: { filters: { type_id: ['elasticache-ri'] } },
          },
          {
            label: 'ElastiCache Idle',
            value: { filters: { type_id: ['elasticache-util-low'] } },
          },
          {
            label: 'ElasticSearch Idle',
            value: { filters: { type_id: ['es-util-low'] } },
          },
          {
            label: 'Load Balancer Idle',
            value: { filters: { type_id: ['idle-load-balancer'] } },
          },
          {
            label: 'IP migration v4 to v6',
            value: { filters: { type_id: ['ip-public-ipv4'] } },
          },
          {
            label: 'IP Unattached',
            value: { filters: { type_id: ['ip-unattached'] } },
          },
          {
            label: 'K8s Workload Rightsizing',
            value: { filters: { type_id: ['k8s-workload-rightsizing'] } },
          },
          {
            label: 'Kinesis Idle',
            value: { filters: { type_id: ['kinesis-util-low'] } },
          },
          {
            label: 'Disabled KMS',
            value: { filters: { type_id: ['kms-idle'] } },
          },
          {
            label: 'Old KMS',
            value: { filters: { type_id: ['kms-old'] } },
          },
          {
            label: 'NAT Gateway Idle',
            value: { filters: { type_id: ['nat-gateway-util-low'] } },
          },
          {
            label: 'Neptune DB Idle',
            value: { filters: { type_id: ['neptune-util-low'] } },
          },
          {
            label: 'OpenSearch Extended Support',
            value: { filters: { type_id: ['opensearch-extended-support'] } },
          },
          {
            label: 'OpenSearch Reserved Instance',
            value: { filters: { type_id: ['opensearch-ri'] } },
          },
          {
            label: 'Operation System',
            value: { filters: { type_id: ['operation-system'] } },
          },
          {
            label: 'RDS Rightsizing',
            value: { filters: { type_id: ['rds-class-change'] } },
          },
          {
            label: 'RDS Extended Support',
            value: { filters: { type_id: ['rds-extended-support'] } },
          },
          {
            label: 'RDS Instance Idle',
            value: { filters: { type_id: ['rds-idle'] } },
          },
          {
            label: 'RDS Provisioned IOPS',
            value: { filters: { type_id: ['rds-iops-change'] } },
          },
          {
            label: 'RDS Aurora I/O Optimized Configuration',
            value: { filters: { type_id: ['rds-iops-optimized'] } },
          },
          {
            label: 'RDS Reserved Instance',
            value: { filters: { type_id: ['rds-ri'] } },
          },
          {
            label: 'RDS Storage Type Change',
            value: { filters: { type_id: ['rds-storage-type-change'] } },
          },
          {
            label: 'RDS Generation Upgrade',
            value: { filters: { type_id: ['rds-version-upgrade'] } },
          },
          {
            label: 'Redshift Reserved Instance',
            value: { filters: { type_id: ['redshift-ri'] } },
          },
          {
            label: 'Redshift Idle',
            value: { filters: { type_id: ['redshift-util-low'] } },
          },
          {
            label: 'Region Migration',
            value: { filters: { type_id: ['region-migration'] } },
          },
          {
            label: 'S3 Inactive',
            value: { filters: { type_id: ['s3-idle'] } },
          },
          {
            label: 'S3 Multipart upload',
            value: { filters: { type_id: ['s3-multipart-upload'] } },
          },
          {
            label: 'S3 Storage Class',
            value: { filters: { type_id: ['s3-storage-class'] } },
          },
          {
            label: 'S3 Versioning',
            value: { filters: { type_id: ['s3-versioning'] } },
          },
          {
            label: 'Unused Secrets',
            value: { filters: { type_id: ['unused-secrets'] } },
          },
          {
            label: 'EC2 Generation Upgrade',
            value: { filters: { type_id: ['version-upgrade'] } },
          },
          {
            label: 'VPC Endpoint Idle',
            value: { filters: { type_id: ['vpc-endpoint-idle'] } },
          },
          {
            label: 'App Service Reserved Capacity',
            value: {
              filters: { type_id: ['azure-app-service-reserved-capacity'] },
            },
          },
          {
            label: 'CosmosDB Reserved Capacity',
            value: {
              filters: { type_id: ['azure-cosmos-db-reserved-capacity'] },
            },
          },
          {
            label: 'CosmosDB Rightsizing',
            value: { filters: { type_id: ['azure-cosmos-db-right-sizing'] } },
          },
          {
            label: 'CosmosDB Idle',
            value: { filters: { type_id: ['azure-cosmos-idle'] } },
          },
          {
            label: 'Data Explorer Reserved Capacity',
            value: {
              filters: { type_id: ['azure-data-explorer-reserved-capacity'] },
            },
          },
          {
            label: 'DataBase Reserved Instance',
            value: { filters: { type_id: ['azure-db-ri'] } },
          },
          {
            label: 'Disk Type Change',
            value: { filters: { type_id: ['azure-disk-type-change'] } },
          },
          {
            label: 'Disk Unattached',
            value: { filters: { type_id: ['azure-disk-unattached'] } },
          },
          {
            label: 'Example',
            value: { filters: { type_id: ['azure-example'] } },
          },
          {
            label: 'Load Balancer Idle',
            value: { filters: { type_id: ['azure-idle-load-balancer'] } },
          },
          {
            label: 'IP Unattached',
            value: { filters: { type_id: ['azure-ip-unattached'] } },
          },
          {
            label: 'K8s Workload Rightsizing',
            value: { filters: { type_id: ['azure-k8s-workload-rightsizing'] } },
          },
          {
            label: 'Kusto Unused Data',
            value: { filters: { type_id: ['azure-kusto-unused-data'] } },
          },
          {
            label: 'MariaDB Idle',
            value: { filters: { type_id: ['azure-maria-idle'] } },
          },
          {
            label: 'MySQL Idle',
            value: { filters: { type_id: ['azure-mysql-idle'] } },
          },
          {
            label: 'MySQL Reserved Capacity',
            value: { filters: { type_id: ['azure-mysql-reserved-capacity'] } },
          },
          {
            label: 'Snapshot Outdated',
            value: { filters: { type_id: ['azure-outdated-snapshot'] } },
          },
          {
            label: 'PostgresSQL Idle',
            value: { filters: { type_id: ['azure-postgres-idle'] } },
          },
          {
            label: 'PostgreSQL Reserved Capacity',
            value: {
              filters: { type_id: ['azure-postgresql-reserved-capacity'] },
            },
          },
          {
            label: 'Redis Reserved Capacity',
            value: { filters: { type_id: ['azure-redis-reserved-capacity'] } },
          },
          {
            label: 'Snapshot Migration',
            value: { filters: { type_id: ['azure-snapshot-migration'] } },
          },
          {
            label: 'SQL Data Warehouse Reserved Capacity',
            value: {
              filters: {
                type_id: ['azure-sql-data-warehouse-reserved-capacity'],
              },
            },
          },
          {
            label: 'SQL Idle',
            value: { filters: { type_id: ['azure-sql-idle'] } },
          },
          {
            label: 'SQL Reserved Capacity',
            value: { filters: { type_id: ['azure-sql-reserved-capacity'] } },
          },
          {
            label: 'Azure SQL Database Rightsizing',
            value: { filters: { type_id: ['azure-sql-rightsizing'] } },
          },
          {
            label: 'Virtual Machine Idle',
            value: { filters: { type_id: ['azure-vm-idle'] } },
          },
          {
            label: 'Virtual Machine Reserved Instance',
            value: { filters: { type_id: ['azure-vm-ri'] } },
          },
          {
            label: 'Virtual Machine Rightsizing',
            value: { filters: { type_id: ['azure-vm-rightsizing'] } },
          },
          {
            label: 'Compute Saving Plans',
            value: { filters: { type_id: ['azure-vm-sp'] } },
          },
          {
            label: 'Virtual Machine Stopped',
            value: { filters: { type_id: ['azure-vm-stopped'] } },
          },
          {
            label: 'Disk Unattached',
            value: { filters: { type_id: ['gcp-disk-unattached'] } },
          },
          {
            label: 'Example',
            value: { filters: { type_id: ['gcp-example'] } },
          },
          {
            label: 'IP Idle',
            value: { filters: { type_id: ['gcp-ip-idle'] } },
          },
          {
            label: 'Commitment Usage Discount',
            value: { filters: { type_id: ['gcp-usage-commitment'] } },
          },
          {
            label: 'Virtual Machine Idle',
            value: { filters: { type_id: ['gcp-vm-idle'] } },
          },
          {
            label: 'Virtual Machine Rightsizing',
            value: { filters: { type_id: ['gcp-vm-rightsizing'] } },
          },
          {
            label: 'Virtual Machine Stopped',
            value: { filters: { type_id: ['gcp-vm-stopped'] } },
          },
        ],
      },
    });
  });
});
