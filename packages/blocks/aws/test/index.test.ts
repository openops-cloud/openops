import { aws } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct authentication', () => {
    expect(aws.auth).toMatchObject({
      props: {
        accessKeyId: {
          required: true,
          type: 'SECRET_TEXT',
        },
        secretAccessKey: {
          required: true,
          type: 'SECRET_TEXT',
        },
        defaultRegion: {
          required: true,
          type: 'SHORT_TEXT',
        },
      },
    });
  });

  test('should return block with correct number of actions', () => {
    expect(Object.keys(aws.actions()).length).toBe(22);
    expect(aws.actions()).toMatchObject({
      ebs_get_volumes: {
        name: 'ebs_get_volumes',
        requireAuth: true,
      },
      ebs_get_snapshots: {
        name: 'ebs_get_snapshots',
        requireAuth: true,
      },
      ebs_delete_volumes: {
        name: 'ebs_delete_volumes',
        requireAuth: true,
      },
      ebs_modify_volume: {
        name: 'ebs_modify_volume',
        requireAuth: true,
      },
      ec2_modify_instance: {
        name: 'ec2_modify_instance',
        requireAuth: true,
      },
      ec2_start_instance: {
        name: 'ec2_start_instance',
        requireAuth: true,
      },
      ec2_stop_instance: {
        name: 'ec2_stop_instance',
        requireAuth: true,
      },
      add_tags_to_resources: {
        name: 'add_tags_to_resources',
        requireAuth: true,
      },
      get_account_id: {
        name: 'get_account_id',
        requireAuth: true,
      },
      ebs_create_snapshot_action: {
        name: 'ebs_create_snapshot_action',
        requireAuth: true,
      },
      ebs_delete_snapshot_action: {
        name: 'ebs_delete_snapshot_action',
        requireAuth: true,
      },
      rds_delete_snapshot: {
        name: 'rds_delete_snapshot',
        requireAuth: true,
      },
      rds_create_snapshot: {
        name: 'rds_create_snapshot',
        requireAuth: true,
      },
      rds_delete_instance: {
        name: 'rds_delete_instance',
        requireAuth: true,
      },
      rds_describe_instances: {
        name: 'rds_describe_instances',
        requireAuth: true,
      },
      get_price: {
        name: 'get_price',
        requireAuth: true,
      },
      build_arn: {
        name: 'build_arn',
        requireAuth: true,
      },
      parse_arn: {
        name: 'parse_arn',
        requireAuth: true,
      },
      ec2_terminate_instances: {
        name: 'ec2_terminate_instances',
        requireAuth: true,
      },
      ec2_get_instances: {
        name: 'ec2_get_instances',
        requireAuth: true,
      },
      aws_cli: {
        name: 'aws_cli',
        requireAuth: true,
      },
    });
  });
});
