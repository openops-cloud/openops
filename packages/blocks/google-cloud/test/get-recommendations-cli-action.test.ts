const openOpsMock = {
  ...jest.requireActual('@openops/common'),
  getUseHostSessionProperty: jest.fn().mockReturnValue({
    type: 'DYNAMIC',
    required: true,
  }),
  handleCliError: jest.fn(),
};

jest.mock('@openops/common', () => openOpsMock);

const gcloudCliMock = {
  runCommand: jest.fn(),
  runCommands: jest.fn(),
};

jest.mock('../src/lib/google-cloud-cli', () => gcloudCliMock);

import { getRecommendationsAction } from '../src/lib/actions/get-recommendations-cli-action';

const auth = {
  clientEmail: 'some-client-email',
  privateKey: 'some-private-key',
  projectId: 'some-project-id',
};

describe('getRecommendationsAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with expected props', () => {
    expect(Object.keys(getRecommendationsAction.props)).toContain(
      'useHostSession',
    );
    expect(getRecommendationsAction.props).toHaveProperty('filterBySelection');
    expect(getRecommendationsAction.props).toHaveProperty('filterByProperty');
    expect(getRecommendationsAction.props).toHaveProperty('recommenders');
    expect(getRecommendationsAction.props).toHaveProperty('location');
  });

  test('should throw error if recommenders are not set', async () => {
    const context = createContext({
      filterByProperty: { project: 'abc' },
      location: 'europe-west1',
    });

    await getRecommendationsAction.run(context);

    expect(openOpsMock.handleCliError).toHaveBeenCalledWith({
      provider: 'Google Cloud',
      command: '',
      error: new Error('Recommenders are required'),
    });
  });

  test('should return empty property when unauthenticated', async () => {
    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterByProperty'
    ].props(
      {
        auth: undefined as any,
        useHostSession: { useHostSessionCheckbox: false },
      },
      context,
    );

    expect(result).toStrictEqual({});
  });

  test('should return dynamic dropdown property for billingAccount', async () => {
    const context = createContext({});
    gcloudCliMock.runCommand.mockResolvedValue(
      JSON.stringify([
        { name: 'billingAccounts/abc', displayName: 'Billing 1' },
      ]),
    );

    const result = await getRecommendationsAction.props[
      'filterByProperty'
    ].props(
      {
        auth,
        useHostSession: { useHostSessionCheckbox: true },
        filterBySelection: 'billingAccount' as any,
      },
      context,
    );

    expect(result['billingAccount']).toMatchObject({
      displayName: 'Billing Account',
      type: 'STATIC_DROPDOWN',
    });

    expect(gcloudCliMock.runCommand).toHaveBeenCalledWith(
      'gcloud billing accounts list --format=json',
      auth,
      true,
    );
  });

  test('should return dynamic short text property for folder', async () => {
    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterByProperty'
    ].props(
      {
        auth,
        useHostSession: { useHostSessionCheckbox: true },
        filterBySelection: 'folder' as any,
      },
      context,
    );

    expect(result['folder']).toMatchObject({
      displayName: 'Folder ID',
      type: 'SHORT_TEXT',
    });

    expect(gcloudCliMock.runCommand).not.toHaveBeenCalled();
  });

  test('should return empty object if no filterBySelection', async () => {
    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterByProperty'
    ].props(
      {
        auth,
        useHostSession: { useHostSessionCheckbox: true },
      },
      context,
    );

    expect(result).toEqual({});
  });

  test('should build correct command and parse responses for multiple recommenders', async () => {
    const context = createContext({
      useHostSession: { useHostSessionCheckbox: true },
      filterByProperty: { organization: 'org-789' },
      location: 'us-east1',
      recommenders: ['recommender-1', 'recommender-2'],
    });

    gcloudCliMock.runCommands.mockResolvedValueOnce([
      '[{"name":"r1"}]',
      '[{"name":"r2"}]',
    ]);
    const result = await getRecommendationsAction.run(context);

    expect(gcloudCliMock.runCommand).not.toHaveBeenCalledTimes(2);
    expect(gcloudCliMock.runCommands).toHaveBeenCalledWith(
      [
        'gcloud recommender recommendations list --format=json --organization=org-789 --location=us-east1 --recommender=recommender-1',
        'gcloud recommender recommendations list --format=json --organization=org-789 --location=us-east1 --recommender=recommender-2',
      ],
      auth,
      true,
    );

    expect(result).toEqual([
      { name: 'r1', source: 'recommender-1' },
      { name: 'r2', source: 'recommender-2' },
    ]);
  });

  test('should call handleCliError when gcloud command fails', async () => {
    const context = createContext({
      useHostSession: { useHostSessionCheckbox: true },
      filterByProperty: { project: 'project-123' },
      location: 'europe-west2',
      recommenders: ['recommender-z'],
    });

    const error = new Error('CLI failed');
    gcloudCliMock.runCommands.mockRejectedValue(error);

    await getRecommendationsAction.run(context);

    expect(openOpsMock.handleCliError).toHaveBeenCalledWith({
      provider: 'Google Cloud',
      command: '',
      error,
    });
  });
});

function createContext(propsValue?: any) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth,
    propsValue,
  };
}
