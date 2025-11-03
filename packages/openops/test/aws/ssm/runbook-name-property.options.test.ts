import { DocumentIdentifier } from '@aws-sdk/client-ssm';

const getSsmDocuments = jest.fn();
jest.mock('../../../src/lib/aws/ssm/get-ssm-documents', () => ({
  getSsmDocuments: (...args: any[]) => getSsmDocuments(...args),
}));

import type { PropertyContext } from '@openops/blocks-framework';
import { runbookNameProperty } from '../../../src/lib/aws/ssm/runbook-name-property';

function createCtx(): PropertyContext {
  return {
    getRefresher: jest.fn(),
    getValue: jest.fn(),
    setValue: jest.fn(),
  } as unknown as PropertyContext;
}

describe('runbookNameProperty.options', () => {
  const ctx = createCtx();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns disabled with placeholder when auth is missing', async () => {
    const res = await runbookNameProperty.options(
      { auth: undefined, owner: undefined, region: 'us-east-1' },
      ctx,
    );

    expect(res).toEqual({
      disabled: true,
      options: [],
      placeholder: 'Please authenticate first',
    });

    expect(getSsmDocuments).not.toHaveBeenCalled();
  });

  test('returns disabled with placeholder when region is missing and no defaultRegion', async () => {
    const auth = {};

    const res = await runbookNameProperty.options(
      { auth, owner: undefined, region: undefined },
      ctx,
    );

    expect(res).toEqual({
      disabled: true,
      options: [],
      placeholder: 'Please provide a region',
    });

    expect(getSsmDocuments).not.toHaveBeenCalled();
  });

  test('uses provided region over auth.defaultRegion and maps docs to options', async () => {
    const auth = { defaultRegion: 'us-west-2' };
    const owner = 'Self';
    const region = 'us-east-1';

    const docs: Partial<DocumentIdentifier>[] = [
      { Name: 'AWS-RunShellScript' },
      { Name: 'MyCustomRunbook' },
    ];
    getSsmDocuments.mockResolvedValueOnce(docs);

    const res = await runbookNameProperty.options({ auth, owner, region }, ctx);

    expect(getSsmDocuments).toHaveBeenCalledTimes(1);
    expect(getSsmDocuments).toHaveBeenCalledWith({
      auth,
      region,
      owner,
    });

    expect(res).toEqual({
      disabled: false,
      options: [
        { label: 'AWS-RunShellScript', value: 'AWS-RunShellScript' },
        { label: 'MyCustomRunbook', value: 'MyCustomRunbook' },
      ],
    });
  });

  test('uses auth.defaultRegion when region arg is missing', async () => {
    const auth = { defaultRegion: 'eu-central-1' };
    const owner = 'Amazon';

    getSsmDocuments.mockResolvedValueOnce([]);

    const res = await runbookNameProperty.options(
      { auth, owner, region: undefined },
      ctx,
    );

    expect(getSsmDocuments).toHaveBeenCalledWith({
      auth,
      region: 'eu-central-1',
      owner,
    });
    expect(res).toEqual({ disabled: false, options: [] });
  });

  test('returns disabled with error and placeholder when getSsmDocuments throws', async () => {
    const auth = { defaultRegion: 'eu-west-1' };
    const err = new Error('boom');
    getSsmDocuments.mockRejectedValueOnce(err);

    const res = await runbookNameProperty.options(
      { auth, owner: undefined, region: undefined },
      ctx,
    );

    expect(res).toEqual({
      disabled: true,
      options: [],
      placeholder: 'Failed to load runbooks',
      error: String(err),
    });
  });
});
