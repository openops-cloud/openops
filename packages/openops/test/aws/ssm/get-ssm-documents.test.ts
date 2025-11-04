import { BlockPropValueSchema } from '@openops/blocks-framework';
import { DocumentOwner } from '../../../src/lib/aws/ssm/document-owner';
import { getSsmDocuments } from '../../../src/lib/aws/ssm/get-ssm-documents';

jest.mock('@aws-sdk/client-ssm', () => {
  const ListDocumentsCommand = jest
    .fn()
    .mockImplementation(function (this: any, input: any) {
      this.input = input;
    });
  return {
    ListDocumentsCommand,
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

const { ListDocumentsCommand: ListDocumentsCommandMock } = jest.requireMock(
  '@aws-sdk/client-ssm',
);

describe('getSsmDocuments', () => {
  const auth = { some: 'auth' } as unknown as BlockPropValueSchema<any>;
  const region = 'us-east-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns flattened DocumentIdentifiers from multiple pages', async () => {
    const d1 = { Name: 'doc1' };
    const d2 = { Name: 'doc2' };

    makeAwsRequest.mockResolvedValueOnce([
      { DocumentIdentifiers: [d1] },
      { DocumentIdentifiers: [d2] },
    ]);

    const result = await getSsmDocuments({ auth, region });

    expect(ListDocumentsCommandMock).toHaveBeenCalledTimes(1);
    const input = (ListDocumentsCommandMock as jest.Mock).mock.calls[0][0];
    expect(input).toEqual({
      Filters: [{ Key: 'DocumentType', Values: ['Automation'] }],
    });

    expect(makeAwsRequest).toHaveBeenCalledTimes(1);
    const [clientArg, commandArg] = makeAwsRequest.mock.calls[0];
    expect(clientArg).toBe(mockClient);
    expect(commandArg).toBeInstanceOf(ListDocumentsCommandMock);
    expect(commandArg.input).toEqual({
      Filters: [{ Key: 'DocumentType', Values: ['Automation'] }],
    });

    expect(result).toEqual([d1, d2]);
  });

  test('applies Owner filter when provided and not All', async () => {
    makeAwsRequest.mockResolvedValueOnce([{ DocumentIdentifiers: [] }]);

    await getSsmDocuments({
      auth,
      region,
      owner: DocumentOwner.Self,
      type: 'Automation',
    });

    expect(ListDocumentsCommandMock).toHaveBeenCalledTimes(1);
    const input = (ListDocumentsCommandMock as jest.Mock).mock.calls[0][0];
    expect(input).toEqual({
      Filters: [
        { Key: 'DocumentType', Values: ['Automation'] },
        { Key: 'Owner', Values: [DocumentOwner.Self] },
      ],
    });
  });

  test('omits Owner filter when owner is undefined', async () => {
    makeAwsRequest.mockResolvedValueOnce([{ DocumentIdentifiers: [] }]);

    await getSsmDocuments({ auth, region, type: 'Command' });

    const input = (ListDocumentsCommandMock as jest.Mock).mock.calls[0][0];
    expect(input).toEqual({
      Filters: [{ Key: 'DocumentType', Values: ['Command'] }],
    });
  });

  test('omits Owner filter when owner is All', async () => {
    makeAwsRequest.mockResolvedValueOnce([{ DocumentIdentifiers: [] }]);

    await getSsmDocuments({
      auth,
      region,
      owner: DocumentOwner.All,
      type: 'Policy',
    });

    const input = (ListDocumentsCommandMock as jest.Mock).mock.calls[0][0];
    expect(input).toEqual({
      Filters: [{ Key: 'DocumentType', Values: ['Policy'] }],
    });
  });

  test('returns empty array when pages have no DocumentIdentifiers', async () => {
    makeAwsRequest.mockResolvedValueOnce([
      {},
      { DocumentIdentifiers: undefined },
    ]);

    const result = await getSsmDocuments({ auth, region });

    expect(result).toEqual([]);
  });

  test('returns empty array when makeAwsRequest returns no pages', async () => {
    makeAwsRequest.mockResolvedValueOnce([]);

    const result = await getSsmDocuments({ auth, region });

    expect(result).toEqual([]);
  });
});
