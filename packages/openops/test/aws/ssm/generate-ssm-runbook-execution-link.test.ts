import {
  generateBaseSSMRunbookExecutionLink,
  generateSSMRunbookExecutionParams,
} from '../../../src/lib/aws/ssm/generate-ssm-runbook-execution-link';

describe('generateBaseSSMRunbookExecutionLink', () => {
  it('builds the correct base URL with region, runbook name and version', () => {
    const url = generateBaseSSMRunbookExecutionLink(
      'us-east-1',
      'AWS-RestartEC2Instance',
      '1',
    );

    expect(url).toBe(
      'https://us-east-1.console.aws.amazon.com/systems-manager/automation/execute/AWS-RestartEC2Instance?region=us-east-1#documentVersion=1&',
    );
  });

  it('omits documentVersion when version is empty string', () => {
    const url = generateBaseSSMRunbookExecutionLink(
      'us-east-1',
      'AWS-RestartEC2Instance',
      '',
    );

    expect(url).toBe(
      'https://us-east-1.console.aws.amazon.com/systems-manager/automation/execute/AWS-RestartEC2Instance?region=us-east-1#',
    );
  });

  it('encodes runbook name, region and version properly', () => {
    const url = generateBaseSSMRunbookExecutionLink(
      'eu-west-1',
      'My Runbook/Name',
      '3$beta',
    );

    expect(url).toBe(
      'https://eu-west-1.console.aws.amazon.com/systems-manager/automation/execute/My%20Runbook%2FName?region=eu-west-1#documentVersion=3%24beta&',
    );
  });
});

describe('generateSSMRunbookExecutionParams', () => {
  it('returns empty string for empty or all-omitted inputs', () => {
    expect(generateSSMRunbookExecutionParams({})).toBe('');

    expect(
      generateSSMRunbookExecutionParams({ a: undefined, b: null, c: '' }),
    ).toBe('');
  });

  it('encodes primitive parameter values correctly', () => {
    const hash = generateSSMRunbookExecutionParams({
      InstanceId: 'i-123 456',
      Count: 2,
      DryRun: false,
    });

    expect(hash).toBe('#InstanceId=i-123%20456&Count=2&DryRun=false');
  });

  it('encodes array of primitives as a comma+space separated string', () => {
    const hash = generateSSMRunbookExecutionParams({
      InstanceIds: ['i-1', 'i-2', 'i 3'],
    });

    expect(hash).toBe('#InstanceIds=i-1%2C%20i-2%2C%20i%203');
  });

  it('encodes arrays with non-primitive items as JSON', () => {
    const value = [{ Key: 'tag:Name', Values: ['web', 'api'] }];
    const expected = encodeURIComponent(JSON.stringify(value));

    const hash = generateSSMRunbookExecutionParams({ Targets: value });

    expect(hash).toBe(`#Targets=${expected}`);
  });

  it('encodes plain object values as JSON', () => {
    const value = { Force: true, Mode: 'safe' };
    const expected = encodeURIComponent(JSON.stringify(value));

    const hash = generateSSMRunbookExecutionParams({ Options: value });

    expect(hash).toBe(`#Options=${expected}`);
  });

  it('encodes parameter names (keys) as well', () => {
    const hash = generateSSMRunbookExecutionParams({
      'Param Name': 'value/1 2',
    });

    expect(hash).toBe('#Param%20Name=value%2F1%202');
  });
});
