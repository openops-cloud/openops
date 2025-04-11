import { parseArnAction } from '../../src/lib/actions/arn/parse-arn-action';

describe('parseArnAction', () => {
  test('should return action with correct properties', () => {
    expect(parseArnAction.props).toMatchObject({
      arn: {
        type: 'SHORT_TEXT',
        required: true,
      },
    });
  });

  it('should parse the given ARN', async () => {
    const result = await parseArnAction.run({
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        arn: 'arn:aws:ec2:us-west-2:123456789012:instance/i-1234567890abcdef0',
      },
    });
    expect(result).toEqual({
      region: 'us-west-2',
      accountId: '123456789012',
      resourceId: 'i-1234567890abcdef0',
      service: 'ec2',
      partition: 'aws',
    });
  });
});
