const getSsmDescribeDocumentInfo = jest.fn();
jest.mock('../../../src/lib/aws/ssm/get-ssm-describe-document-info', () => ({
  getSsmDescribeDocumentInfo: (...args: any[]) =>
    getSsmDescribeDocumentInfo(...args),
}));

jest.mock('@openops/server-shared', () => ({ logger: { warn: jest.fn() } }));

jest.mock('@openops/blocks-framework', () => {
  const Property = {
    DynamicProperties: (schema: any) => schema,
    Array: (cfg: any) => ({ kind: 'Array', ...cfg }),
    Number: (cfg: any) => ({ kind: 'Number', ...cfg }),
    Checkbox: (cfg: any) => ({ kind: 'Checkbox', ...cfg }),
    Object: (cfg: any) => ({ kind: 'Object', ...cfg }),
    Json: (cfg: any) => ({ kind: 'Json', ...cfg }),
    ShortText: (cfg: any) => ({ kind: 'ShortText', ...cfg }),
  };
  return { Property, BlockPropValueSchema: {} };
});

import type { PropertyContext } from '@openops/blocks-framework';
import { runbookParametersProperty } from '../../../src/lib/aws/ssm/runbook-parameters-property';

describe('runbookParametersProperty.props', () => {
  const ctx = {} as PropertyContext;
  const callProps = (props: Record<string, unknown>) =>
    runbookParametersProperty.props(props as any, ctx);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty object when auth is missing', async () => {
    const res = await callProps({
      auth: undefined,
      region: 'us-east-1',
      runbook: 'AWS-RunShellScript',
      version: undefined,
    });

    expect(res).toEqual({});
    expect(getSsmDescribeDocumentInfo).not.toHaveBeenCalled();
  });

  test('returns empty object when runbook is missing', async () => {
    const res = await callProps({
      auth: { defaultRegion: 'us-east-1' },
      region: 'us-east-1',
      runbook: undefined,
      version: undefined,
    });

    expect(res).toEqual({});
    expect(getSsmDescribeDocumentInfo).not.toHaveBeenCalled();
  });

  test('returns empty object when region missing and no auth.defaultRegion', async () => {
    const res = await callProps({
      auth: {},
      region: undefined,
      runbook: 'AWS-RunShellScript',
      version: undefined,
    });

    expect(res).toEqual({});
    expect(getSsmDescribeDocumentInfo).not.toHaveBeenCalled();
  });

  test('uses provided region over auth.defaultRegion and forwards version', async () => {
    const auth = { defaultRegion: 'us-west-2' } as any;
    const region = 'eu-central-1';
    const runbook = 'AWS-RunShellScript';

    getSsmDescribeDocumentInfo.mockResolvedValueOnce([]);

    const res = await callProps({
      auth,
      region,
      runbook,
      version: '7',
    });

    expect(res).toEqual({});

    expect(getSsmDescribeDocumentInfo).toHaveBeenCalledTimes(1);
    expect(getSsmDescribeDocumentInfo).toHaveBeenCalledWith({
      auth,
      region,
      version: '7',
      runbookName: runbook,
    });
  });

  test('falls back to auth.defaultRegion when region not provided', async () => {
    const auth = { defaultRegion: 'ap-south-1' } as any;
    const runbook = 'MyRunbook';

    getSsmDescribeDocumentInfo.mockResolvedValueOnce([]);

    await callProps({
      auth,
      region: undefined,
      runbook,
      version: undefined,
    });

    expect(getSsmDescribeDocumentInfo).toHaveBeenCalledWith({
      auth,
      region: 'ap-south-1',
      version: undefined,
      runbookName: 'MyRunbook',
    });
  });

  test('maps parameters to appropriate Property types and defaults', async () => {
    const auth = { defaultRegion: 'us-east-1' } as any;

    const params = [
      { Name: 'Count', Type: 'Integer', DefaultValue: '123', Description: 'n' },
      { Name: 'BadCount', Type: 'Integer', DefaultValue: 'abc' },
      { Name: 'FlagTrue', Type: 'Boolean', DefaultValue: 'true' },
      { Name: 'FlagFalse', Type: 'Boolean', DefaultValue: 'False' },
      { Name: 'FlagNo', Type: 'Boolean', DefaultValue: 'no' },
      {
        Name: 'Tags',
        Type: 'StringMap',
        DefaultValue: '{"env":"prod","team":"dev"}',
      },
      { Name: 'BadTags', Type: 'StringMap', DefaultValue: 'not-json' },
      { Name: 'Items', Type: 'MapList', DefaultValue: undefined },
      { Name: 'Names', Type: 'StringList', DefaultValue: '["a","b"]' },
      { Name: 'Ids', Type: 'List<Integer>', DefaultValue: '"x"' },
      { Name: 'Message', Type: 'String', DefaultValue: 'hello' },
      { Name: undefined, Type: 'String', DefaultValue: 'ignored' },
    ];

    getSsmDescribeDocumentInfo.mockResolvedValueOnce(params);

    const result = await callProps({
      auth,
      region: undefined,
      runbook: 'RB',
      version: undefined,
    });

    expect(Object.keys(result).sort()).toEqual(
      [
        'BadCount',
        'BadTags',
        'Count',
        'FlagFalse',
        'FlagNo',
        'FlagTrue',
        'Ids',
        'Items',
        'Message',
        'Names',
        'Tags',
      ].sort(),
    );

    expect(result['Count']).toMatchObject({
      kind: 'Number',
      displayName: 'Count',
      defaultValue: 123,
      required: false,
      description: 'n',
    });
    expect(result['BadCount']).toMatchObject({
      kind: 'Number',
      defaultValue: undefined,
    });

    expect(result['FlagTrue']).toMatchObject({
      kind: 'Checkbox',
      defaultValue: true,
    });
    expect(result['FlagFalse']).toMatchObject({
      kind: 'Checkbox',
      defaultValue: false,
    });
    expect(result['FlagNo']).toMatchObject({
      kind: 'Checkbox',
      defaultValue: false,
    });

    expect(result['Tags']).toMatchObject({
      kind: 'Object',
      defaultValue: { env: 'prod', team: 'dev' },
    });
    expect(result['BadTags']).toMatchObject({
      kind: 'Object',
      defaultValue: undefined,
    });

    expect(result['Items']).toMatchObject({ kind: 'Json', defaultValue: [] });

    expect(result['Names']).toMatchObject({
      kind: 'Array',
      defaultValue: ['a', 'b'],
    });
    expect(result['Ids']).toMatchObject({
      kind: 'Array',
      defaultValue: undefined,
    });

    expect(result['Message']).toMatchObject({
      kind: 'ShortText',
      defaultValue: 'hello',
    });
  });

  test('handles required flag based on DefaultValue presence', async () => {
    const auth = { defaultRegion: 'us-east-1' };

    getSsmDescribeDocumentInfo.mockResolvedValueOnce([
      { Name: 'NoDefault', Type: 'String' },
      { Name: 'UndefinedDefault', Type: 'String', DefaultValue: undefined },
      { Name: 'EmptyDefault', Type: 'String', DefaultValue: '' },
    ]);

    const res = await callProps({
      auth,
      region: undefined,
      runbook: 'RB',
      version: undefined,
    });

    expect(res['NoDefault']).toMatchObject({
      kind: 'ShortText',
      required: true,
      defaultValue: undefined,
    });
    expect(res['UndefinedDefault']).toMatchObject({
      kind: 'ShortText',
      required: false,
      defaultValue: undefined,
    });
    expect(res['EmptyDefault']).toMatchObject({
      kind: 'ShortText',
      required: false,
      defaultValue: undefined,
    });
  });
});
