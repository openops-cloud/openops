import { buildArnAction } from '../../src/lib/actions/arn/build-arn-action';

describe('buildArnAction', () => {
  test('should return action with correct properties', () => {
    expect(buildArnAction.props).toMatchObject({
      service: {
        type: 'SHORT_TEXT',
        required: true,
      },
      accountId: {
        type: 'SHORT_TEXT',
        required: true,
      },
      resourceId: {
        type: 'SHORT_TEXT',
        required: true,
      },
      region: {
        type: 'SHORT_TEXT',
        required: false,
      },
    });
  });

  it('should build ARN from the given parameters', async () => {
    const result = await buildArnAction.run({
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        service: 'ec2',
        region: 'us-west-2',
        accountId: '123456789012',
        resourceId: 'i-1234567890abcdef0',
      },
    });
    expect(result).toEqual(
      'arn:aws:ec2:us-west-2:123456789012:i-1234567890abcdef0',
    );
  });

  test.each([undefined, null, ''])(
    'should build ARN without region when region=%p',
    async (regionVal) => {
      const result = await buildArnAction.run({
        ...jest.requireActual('@openops/blocks-framework'),
        propsValue: {
          service: 'iam',
          region: regionVal,
          accountId: '123456789012',
          resourceId: 'user/David',
        },
      });

      expect(result).toEqual('arn:aws:iam::123456789012:user/David');
    },
  );
});
