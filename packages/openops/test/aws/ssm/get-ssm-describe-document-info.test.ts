import { BlockPropValueSchema } from '@openops/blocks-framework';
import { getSsmDescribeDocumentInfo } from '../../../src/lib/aws/ssm/get-ssm-describe-document-info';

jest.mock('@aws-sdk/client-ssm', () => {
  const DescribeDocumentCommand = jest
    .fn()
    .mockImplementation(function (this: any, input: any) {
      this.input = input;
    });
  return {
    DescribeDocumentCommand,
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

const mockSend = jest.fn();
const mockClient = { send: mockSend } as const;
jest.mock('../../../src/lib/aws/get-client', () => ({
  getAwsClient: jest.fn(() => mockClient),
}));

const { DescribeDocumentCommand: DescribeDocumentCommandMock } =
  jest.requireMock('@aws-sdk/client-ssm');

describe('getSsmDescribeDocumentInfo', () => {
  const auth = { some: 'auth' } as unknown as BlockPropValueSchema<any>;
  const region = 'us-east-1';
  const runbookName = 'AWS-RunShellScript';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns parameters when document is present', async () => {
    const fakeParameters = [
      { Name: 'param1', Type: 'String', DefaultValue: 'abc' },
      { Name: 'param2', Type: 'Integer', DefaultValue: '123' },
    ];

    mockSend.mockResolvedValueOnce({
      Document: { Parameters: fakeParameters },
    });

    const params = await getSsmDescribeDocumentInfo({
      auth,
      region,
      runbookName,
    });

    expect(DescribeDocumentCommandMock).toHaveBeenCalledTimes(1);
    const calledWith = (DescribeDocumentCommandMock as jest.Mock).mock
      .calls[0][0];
    expect(calledWith).toEqual({ Name: runbookName });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(DescribeDocumentCommandMock);
    expect(sentCommand.input).toEqual({ Name: runbookName });

    expect(params).toEqual(fakeParameters);
  });

  test('includes DocumentVersion when version is provided', async () => {
    mockSend.mockResolvedValueOnce({ Document: { Parameters: [] } });

    await getSsmDescribeDocumentInfo({
      auth,
      region,
      runbookName,
      version: '3',
    });

    expect(DescribeDocumentCommandMock).toHaveBeenCalledTimes(1);
    const input = (DescribeDocumentCommandMock as jest.Mock).mock.calls[0][0];
    expect(input).toEqual({ Name: runbookName, DocumentVersion: '3' });
  });

  test.each([
    { response: {}, expected: [] },
    { response: { Document: {} }, expected: [] },
    { response: { Document: { Parameters: undefined } }, expected: [] },
  ])(
    'returns empty array when parameters are missing: %j',
    async ({ response, expected }) => {
      mockSend.mockResolvedValueOnce(response);

      const res = await getSsmDescribeDocumentInfo({
        auth,
        region,
        runbookName,
      });

      expect(res).toEqual(expected);
    },
  );
});
