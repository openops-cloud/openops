import { ssmGenerateRunbookLinkAction } from '../../src/lib/actions/ssm/ssm-generate-runbook-link-action';

type RunResult = { link: string };

describe('ssmGenerateRunbookLinkAction.run', () => {
  const auth = {
    ...jest.requireActual('@openops/blocks-framework'),
    defaultRegion: 'us-west-2',
  };

  test('generates base link using auth.defaultRegion when region is not provided', async () => {
    const ctx = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue: {
        runbook: 'AWS-RestartEC2Instance',
      },
    };

    const result = (await ssmGenerateRunbookLinkAction.run(ctx)) as RunResult;

    expect(result.link).toBe(
      'https://us-west-2.console.aws.amazon.com/systems-manager/automation/execute/AWS-RestartEC2Instance?region=us-west-2#',
    );
  });

  test('honors explicit region override', async () => {
    const ctx = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { defaultRegion: 'us-east-1' },
      propsValue: {
        runbook: 'My-Runbook',
        region: 'eu-central-1',
      },
    };

    const result = (await ssmGenerateRunbookLinkAction.run(ctx)) as RunResult;

    expect(result.link).toBe(
      'https://eu-central-1.console.aws.amazon.com/systems-manager/automation/execute/My-Runbook?region=eu-central-1#',
    );
  });

  test('includes documentVersion when provided', async () => {
    const ctx = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { defaultRegion: 'ap-south-1' },
      propsValue: {
        runbook: 'My-Runbook',
        version: '3',
      },
    };

    const result = (await ssmGenerateRunbookLinkAction.run(ctx)) as RunResult;

    expect(result.link).toBe(
      'https://ap-south-1.console.aws.amazon.com/systems-manager/automation/execute/My-Runbook?region=ap-south-1#documentVersion=3&',
    );
  });

  test('encodes parameters of various types and omits empty values', async () => {
    const ctx = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { defaultRegion: 'us-west-1' },
      propsValue: {
        runbook: 'Param-Runbook',
        parameters: {
          s: 'hello world',
          n: 42,
          b: true,
          arrPrimitives: [1, 'a', true, null, undefined],
          arrObjects: [{ a: 1 }, { b: 2 }],
          obj: { key: 'value' },
          emptyStr: '',
          nothing: undefined,
          nothing2: null,
        },
      },
    };

    const result = (await ssmGenerateRunbookLinkAction.run(ctx)) as RunResult;

    expect(
      result.link.startsWith(
        'https://us-west-1.console.aws.amazon.com/systems-manager/automation/execute/Param-Runbook?region=us-west-1#',
      ),
    ).toBe(true);

    const fragment = result.link.split('#')[1] as string;
    expect(fragment).toBeDefined();

    const expectedParts = [
      's=hello%20world',
      'n=42',
      'b=true',
      'arrPrimitives=%5B1%2C%22a%22%2Ctrue%2Cnull%2Cnull%5D',
      'arrObjects=%5B%7B%22a%22%3A1%7D%2C%7B%22b%22%3A2%7D%5D',
      'obj=%7B%22key%22%3A%22value%22%7D',
    ];

    const actualParts = fragment.split('&');

    for (const forbidden of ['emptyStr', 'nothing', 'nothing2']) {
      expect(
        actualParts.some((part) =>
          part.startsWith(`${encodeURIComponent(forbidden)}=`),
        ),
      ).toBe(false);
    }

    for (const part of expectedParts) {
      expect(actualParts).toContain(part);
    }
  });

  test('encodes special characters in param keys and values', async () => {
    const ctx = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { defaultRegion: 'eu-west-3' },
      propsValue: {
        runbook: 'RB',
        parameters: {
          'key with space': 'value/with?special&chars',
        },
      },
    };

    const result = (await ssmGenerateRunbookLinkAction.run(ctx)) as RunResult;

    expect(result.link).toBe(
      'https://eu-west-3.console.aws.amazon.com/systems-manager/automation/execute/RB?region=eu-west-3#key%20with%20space=value%2Fwith%3Fspecial%26chars',
    );
  });

  test('throws when runbook is missing', async () => {
    const ctx = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: { defaultRegion: 'us-east-2' },
      propsValue: {},
    };

    await expect(ssmGenerateRunbookLinkAction.run(ctx)).rejects.toThrow(
      'Runbook is required',
    );
  });
});
