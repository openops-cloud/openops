import {
  convertToARNArrayWithValidation,
  getResourceIdFromArn,
  groupARNsByAccount,
} from '../src/lib/aws/arn-handler';

describe('ARN Handler Tests', () => {
  describe('getResourceIdFromArn tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test.each([
      ['arn:aws:iam::1:ec2/resource1'],
      ['arn:aws:rds::1:db/resource1'],
    ])('should return the resource id', (arn) => {
      const result = getResourceIdFromArn(arn);

      expect(result).toEqual('resource1');
    });

    test('should throw an error if arn is invalid', () => {
      expect(() => getResourceIdFromArn('arn')).toThrow('Malformed ARN');
    });
  });

  describe('convertToArnArrayWithValidation tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test.each([
      ['arn:aws:iam::1:user/roleName'],
      [['arn:aws:iam::1:user/roleName']],
    ])('converts input to string array successfully', (input) => {
      const result = convertToARNArrayWithValidation(input);

      const expected = Array.isArray(input) ? input : [input];

      expect(result).toStrictEqual(expected);
    });

    test.each([[{}], [null], [undefined], [''], [{ arn: 'instance1' }]])(
      'should throw an error if the provided input is invalid %p',
      (input: any) => {
        expect(() => convertToARNArrayWithValidation(input)).toThrow(
          'Input should be a single ARN or an array of ARNs',
        );
      },
    );
  });

  describe('parseArn tests', () => {
    test.each([
      [
        'arn:aws:iam::123456789012:user/roleName',
        {
          accountId: '123456789012',
          resourceId: 'roleName',
          region: '',
          service: 'iam',
          partition: 'aws',
        },
      ],
      [
        'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0',
        {
          accountId: '123456789012',
          resourceId: 'i-1234567890abcdef0',
          region: 'us-east-1',
          service: 'ec2',
          partition: 'aws',
        },
      ],
      [
        'arn:aws:s3:::my-bucket',
        {
          accountId: '',
          resourceId: 'my-bucket',
          region: '',
          service: 's3',
          partition: 'aws',
        },
      ],
    ])('should parse ARN %s correctly', (arn: string, expectedResult: any) => {
      const result = getResourceIdFromArn(arn);
      expect(result).toEqual(expectedResult.resourceId);
    });
  });
});

describe('groupARNsByAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return empty obj when there are no ARNs', () => {
    const result = groupARNsByAccount([]);
    expect(result).toEqual({});
  });

  test.each([
    [
      ['arn:aws:service:us-east-1:account1:resource1'],
      { account1: ['arn:aws:service:us-east-1:account1:resource1'] },
    ],
    [
      [
        'arn:aws:service:us-east-1:account1:resource1',
        'arn:aws:service:us-east-2:account1:resource2',
      ],
      {
        account1: [
          'arn:aws:service:us-east-1:account1:resource1',
          'arn:aws:service:us-east-2:account1:resource2',
        ],
      },
    ],
    [
      [
        'arn:aws:service:us-east-1:account1:resource1',
        'arn:aws:service:us-east-1:account2:resource1',
      ],
      {
        account1: ['arn:aws:service:us-east-1:account1:resource1'],
        account2: ['arn:aws:service:us-east-1:account2:resource1'],
      },
    ],
  ])('should group by accounts %p', (arns: string[], expectedResult) => {
    const result = groupARNsByAccount(arns);
    expect(result).toEqual(expectedResult);
  });
});
