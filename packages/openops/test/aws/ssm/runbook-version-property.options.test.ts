import { DocumentVersionInfo } from '@aws-sdk/client-ssm';
import type { PropertyContext } from '@openops/blocks-framework';
import { runbookVersionProperty } from '../../../src/lib/aws/ssm/runbook-version-property';

const getSsmDocumentVersions = jest.fn();
jest.mock('../../../src/lib/aws/ssm/get-ssm-document-versions', () => ({
  getSsmDocumentVersions: (...args: any[]) => getSsmDocumentVersions(...args),
}));

describe('runbookVersionProperty.options', () => {
  const ctx = {} as PropertyContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns disabled with placeholder when auth is missing', async () => {
    const res = await runbookVersionProperty.options(
      { auth: undefined, region: 'us-east-1', runbook: 'AWS-RunShellScript' },
      ctx,
    );

    expect(res).toEqual({
      disabled: true,
      options: [],
      placeholder: 'Select runbook first',
    });

    expect(getSsmDocumentVersions).not.toHaveBeenCalled();
  });

  test('returns disabled with placeholder when runbook is missing', async () => {
    const auth = { defaultRegion: 'us-west-2' };

    const res = await runbookVersionProperty.options(
      { auth, region: 'us-east-1', runbook: undefined },
      ctx,
    );

    expect(res).toEqual({
      disabled: true,
      options: [],
      placeholder: 'Select runbook first',
    });

    expect(getSsmDocumentVersions).not.toHaveBeenCalled();
  });

  test('uses provided region over auth.defaultRegion and maps versions to options with labels', async () => {
    const auth = { defaultRegion: 'eu-central-1' };
    const region = 'us-east-1';
    const runbook = 'AWS-RunShellScript';

    const versions: Partial<DocumentVersionInfo>[] = [
      { DocumentVersion: '1' },
      { DocumentVersion: '2', VersionName: 'Stable' },
      { DocumentVersion: '3', IsDefaultVersion: true },
      { DocumentVersion: '4', VersionName: 'Beta', IsDefaultVersion: true },
    ];

    getSsmDocumentVersions.mockResolvedValueOnce(versions);

    const res = await runbookVersionProperty.options(
      { auth, region, runbook },
      ctx,
    );

    expect(getSsmDocumentVersions).toHaveBeenCalledTimes(1);
    expect(getSsmDocumentVersions).toHaveBeenCalledWith({
      auth,
      region,
      runbookName: runbook,
    });

    expect(res).toEqual({
      disabled: false,
      options: [
        { label: '1', value: '1' },
        { label: '2 - Stable', value: '2' },
        { label: '3 (default)', value: '3' },
        { label: '4 - Beta (default)', value: '4' },
      ],
      placeholder: 'Select version',
    });
  });

  test('falls back to auth.defaultRegion when region is not provided', async () => {
    const auth = { defaultRegion: 'ap-southeast-2' };
    const runbook = 'MyRunbook';

    getSsmDocumentVersions.mockResolvedValueOnce([]);

    const res = await runbookVersionProperty.options(
      { auth, region: undefined, runbook },
      ctx,
    );

    expect(getSsmDocumentVersions).toHaveBeenCalledWith({
      auth,
      region: 'ap-southeast-2',
      runbookName: runbook,
    });

    expect(res).toEqual({
      disabled: false,
      options: [],
      placeholder: 'Select version',
    });
  });

  test('returns disabled with error and placeholder when getSsmDocumentVersions throws', async () => {
    const auth = { defaultRegion: 'eu-west-1' };
    const runbook = 'ErrRunbook';
    const err = new Error('boom');

    getSsmDocumentVersions.mockRejectedValueOnce(err);

    const res = await runbookVersionProperty.options(
      { auth, region: undefined, runbook },
      ctx,
    );

    expect(res).toEqual({
      disabled: true,
      options: [],
      placeholder: 'Failed to load versions',
      error: String(err),
    });
  });
});
