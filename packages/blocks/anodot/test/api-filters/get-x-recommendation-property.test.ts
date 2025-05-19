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
            label: 'AWS Backup Outdated Snapshot',
            value: {
              filters: { type_id: ['aws-backup-outdated-snapshot'] },
            },
          },
          {
            label: 'AWS VPC Interface endpoint Idle',
            value: {
              filters: { type_id: ['vpc-endpoint-idle'] },
            },
          },
          {
            label: 'DocumentDB Idle',
            value: {
              filters: { type_id: ['documentdb-util-low'] },
            },
          },
          {
            label: 'ElastiCache Idle',
            value: {
              filters: { type_id: ['elasticache-util-low'] },
            },
          },
          {
            label: 'Elastic IP Unattached',
            value: {
              filters: { type_id: ['ip-unattached'] },
            },
          },
          {
            label: 'Elasticsearch Idle',
            value: {
              filters: { type_id: ['es-util-low'] },
            },
          },
          {
            label: 'Idle Dynamo DB',
            value: {
              filters: { type_id: ['dynamodb-idle'] },
            },
          },
          {
            label: 'Idle EC2 Instance',
            value: {
              filters: { type_id: ['ec2-idle'] },
            },
          },
          {
            label: 'Idle Load Balancer',
            value: {
              filters: { type_id: ['idle-load-balancer'] },
            },
          },
          {
            label: 'Idle RDS',
            value: {
              filters: { type_id: ['rds-idle'] },
            },
          },
          {
            label: 'Inactive S3',
            value: {
              filters: { type_id: ['s3-idle'] },
            },
          },
          {
            label: 'Kinesis Idle',
            value: {
              filters: { type_id: ['kinesis-util-low'] },
            },
          },
          {
            label: 'NAT Gateway Idle',
            value: {
              filters: { type_id: ['nat-gateway-util-low'] },
            },
          },
          {
            label: 'Neptune DB Idle',
            value: {
              filters: { type_id: ['neptune-util-low'] },
            },
          },
          {
            label: 'Outdated EBS Snapshot',
            value: {
              filters: { type_id: ['ebs-outdated-snapshot'] },
            },
          },
          {
            label: 'Redshift Idle',
            value: {
              filters: { type_id: ['redshift-util-low'] },
            },
          },
          {
            label: 'Stopped EC2 Instance',
            value: {
              filters: { type_id: ['ec2-stopped-instance'] },
            },
          },
          {
            label: 'Unattached EBS',
            value: {
              filters: { type_id: ['ebs-unattached'] },
            },
          },
        ],
      },
    });
  });
});
