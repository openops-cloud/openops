import { Property } from '@openops/blocks-framework';

export function getPredefinedRecommendationsDropdownProperty() {
  return Property.StaticDropdown({
    displayName: 'Recommendation',
    description: 'The type of recommendations to fetch',
    options: {
      options: recommendationTypes.map((type: any) => ({
        label: type.label,
        value: { filters: type.filters },
      })),
    },
    required: true,
  });
}

const recommendationTypes = [
  /* {
    label: 'AMI Orphaned Snapshot',
    type_id: [],
  },*/
  {
    label: 'AWS Backup Outdated Snapshot',
    filters: { type_id: ['aws-backup-outdated-snapshot'] },
  },
  {
    label: 'AWS VPC Interface endpoint Idle',
    filters: { type_id: ['vpc-endpoint-idle'] },
  },
  {
    label: 'DocumentDB Idle',
    filters: { type_id: ['documentdb-util-low'] },
  },
  {
    label: 'ElastiCache Idle',
    filters: { type_id: ['elasticache-util-low'] },
  },
  {
    label: 'Elastic IP Unattached',
    filters: { type_id: ['ip-unattached'] },
  },
  {
    label: 'Elasticsearch Idle',
    filters: { type_id: ['es-util-low'] },
  },
  {
    label: 'Idle Dynamo DB',
    filters: { type_id: ['dynamodb-idle'] },
  },
  {
    label: 'Idle EC2 Instance',
    filters: { type_id: ['ec2-idle'] },
  },
  {
    label: 'Idle Load Balancer',
    filters: { type_id: ['idle-load-balancer'] },
  },
  {
    label: 'Idle RDS',
    filters: { type_id: ['rds-idle'] },
  },
  {
    label: 'Inactive S3',
    filters: { type_id: ['s3-idle'] },
  },
  {
    label: 'Kinesis Idle',
    filters: { type_id: ['kinesis-util-low'] },
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
    label: 'Outdated EBS Snapshot',
    filters: { type_id: ['ebs-outdated-snapshot'] },
  },
  {
    label: 'Redshift Idle',
    filters: { type_id: ['redshift-util-low'] },
  },
  {
    label: 'Stopped EC2 Instance',
    filters: { type_id: ['ec2-stopped-instance'] },
  },
  {
    label: 'Unattached EBS',
    filters: { type_id: ['ebs-unattached'] },
  },
];
