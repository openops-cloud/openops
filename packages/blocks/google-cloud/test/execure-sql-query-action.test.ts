const commonMock = {
  ...jest.requireActual('@openops/common'),
  runCliCommand: jest.fn(),
  tryParseJson: jest.fn((input) => JSON.parse(input)),
  handleCliError: jest.fn(),
  getUseHostSessionProperty: jest.fn().mockReturnValue({
    type: 'DYNAMIC',
    required: true,
  }),
};

jest.mock('@openops/common', () => commonMock);

const runCommandMock = jest.fn();
jest.mock('../src/lib/google-cloud-cli', () => ({
  runCommand: runCommandMock,
}));

import { executeSqlQueryAction } from '../src/lib/actions/execute-sql-query-action';

const auth = {
  keyFileContent: 'key file content',
};

describe('executeSqlQueryAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(executeSqlQueryAction.props).toMatchObject({
      useHostSession: {
        type: 'DYNAMIC',
        required: true,
      },
      project: {
        type: 'DROPDOWN',
        required: true,
      },
      sqlText: {
        type: 'SHORT_TEXT',
        required: true,
      },
      params: {
        type: 'ARRAY',
        required: false,
      },
      dryRun: {
        type: 'CHECKBOX',
        required: false,
      },
    });
  });

  test('should call runCommand with correct params', async () => {
    runCommandMock.mockResolvedValueOnce('[{"id":1,"name":"test"}]');
    const context = createContext({
      dryRun: false,
      project: 'test-project',
      useHostSession: { useHostSessionCheckbox: true },
      sqlText: 'SELECT * FROM my_table',
      params: [
        {
          paramName: 'param1',
          columnType: 'STRING',
          value: 'value1',
        },
      ],
    });

    const result = await executeSqlQueryAction.run(context);

    expect(runCommandMock).toHaveBeenCalledWith(
      `bq query --nouse_legacy_sql --format=json --parameter='param1:STRING:value1' 'SELECT * FROM my_table'`,
      auth,
      true,
      'test-project',
      'bq',
    );
    expect(commonMock.tryParseJson).toHaveBeenCalledWith(
      '[{"id":1,"name":"test"}]',
    );
    expect(result).toEqual([{ id: 1, name: 'test' }]);
  });

  test('should handle error using handleCliError', async () => {
    runCommandMock.mockRejectedValueOnce(new Error('BigQuery error'));
    const context = createContext({
      dryRun: false,
      project: 'test-project',
      sqlText: 'SELECT * FROM invalid_table',
    });

    await executeSqlQueryAction.run(context);

    expect(commonMock.tryParseJson).not.toHaveBeenCalled();
    expect(commonMock.handleCliError).toHaveBeenCalledWith({
      provider: 'Google Cloud',
      command: 'SELECT * FROM invalid_table',
      error: new Error('BigQuery error'),
    });
  });
});

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: propsValue,
  };
}
