import { BlockPropValueSchema } from '@openops/blocks-framework';
import { getSsmDocumentVersions } from '../../../src/lib/aws/ssm/get-ssm-document-versions';

jest.mock('@aws-sdk/client-ssm', () => {
  const ListDocumentVersionsCommand = jest
    .fn()
    .mockImplementation(function (this: any, input: any) {
      this.input = input;
    });
  return {
    ListDocumentVersionsCommand,
    SSMClient: jest.fn(),
  };
});

jest.mock('../../../src/lib/aws/auth', () => {
  const getCredentialsForAccount = jest.fn().mockResolvedValue({
    accessKeyId: 'AKIA...TEST',
    secretAccessKey: 'SECRET',
    sessionToken: 'TOKEN',
  });
  return {
    getCredentialsForAccount,
    amazonAuth: {} as any,
  };
});

const mockClient = { send: jest.fn() } as const;
jest.mock('../../../src/lib/aws/get-client', () => ({
  getAwsClient: jest.fn(() => mockClient),
}));

const makeAwsRequest = jest.fn();
jest.mock('../../../src/lib/aws/aws-client-wrapper', () => ({
  makeAwsRequest: (...args: any[]) => makeAwsRequest(...args),
}));

const { ListDocumentVersionsCommand: ListDocumentVersionsCommandMock } =
  jest.requireMock('@aws-sdk/client-ssm');

describe('getSsmDocumentVersions', () => {
  const auth = { some: 'auth' } as unknown as BlockPropValueSchema<any>;
  const region = 'us-east-1';
  const runbookName = 'AWS-RunShellScript';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns flattened DocumentVersions from multiple pages', async () => {
    const v1 = { Name: 'doc', DocumentVersion: '1' };
    const v2 = { Name: 'doc', DocumentVersion: '2' };
    const v3 = { Name: 'doc', DocumentVersion: '3' };

    makeAwsRequest.mockResolvedValueOnce([
      { DocumentVersions: [v1] },
      { DocumentVersions: [v2, v3] },
    ]);

    const result = await getSsmDocumentVersions({ auth, region, runbookName });

    expect(ListDocumentVersionsCommandMock).toHaveBeenCalledTimes(1);
    const input = (ListDocumentVersionsCommandMock as jest.Mock).mock
      .calls[0][0];
    expect(input).toEqual({ Name: runbookName });

    expect(makeAwsRequest).toHaveBeenCalledTimes(1);
    const [clientArg, commandArg] = makeAwsRequest.mock.calls[0];
    expect(clientArg).toBe(mockClient);
    expect(commandArg).toBeInstanceOf(ListDocumentVersionsCommandMock);
    expect(commandArg.input).toEqual({ Name: runbookName });

    expect(result).toEqual([v1, v2, v3]);
  });

  test('returns empty array when pages have no DocumentVersions', async () => {
    makeAwsRequest.mockResolvedValueOnce([{}, { DocumentVersions: undefined }]);

    const result = await getSsmDocumentVersions({ auth, region, runbookName });

    expect(result).toEqual([]);
  });

  test('returns empty array when makeAwsRequest returns no pages', async () => {
    makeAwsRequest.mockResolvedValueOnce([]);

    const result = await getSsmDocumentVersions({ auth, region, runbookName });

    expect(result).toEqual([]);
  });
});
