const openOpsMock = {
  ...jest.requireActual('@openops/common'),
  getUseHostSessionProperty: jest.fn().mockReturnValue({
    type: 'DYNAMIC',
    required: true,
  }),
  handleCliError: jest.fn(),
  tryParseJson: jest.fn((x) => x),
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

  test('should return filtered options if authenticated or using host session', async () => {
    gcloudCliMock.runCommands.mockResolvedValue([
      JSON.stringify([{ name: 'billingAccounts/abc', displayName: 'BA 1' }]),
      JSON.stringify([{ name: 'organizations/def', displayName: 'Org 1' }]),
      JSON.stringify([{ name: 'Project One', projectId: 'proj-1' }]),
    ]);

    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterBySelection'
    ].options(
      { auth: auth, useHostSession: { useHostSessionCheckbox: true } },
      context,
    );

    expect(result.disabled).toBe(false);
    expect(result.options).toEqual([
      {
        label: 'Filter by Billing Account',
        value: {
          billingAccount: expect.objectContaining({
            displayName: 'Billing Account',
          }),
        },
      },
      {
        label: 'Filter by Organization ID',
        value: {
          organization: expect.objectContaining({
            displayName: 'Organization ID',
          }),
        },
      },
      {
        label: 'Filter by Project ID',
        value: {
          project: expect.objectContaining({
            displayName: 'Project ID',
          }),
        },
      },
      {
        label: 'Filter by Folder ID',
        value: {
          folder: expect.objectContaining({
            displayName: 'Folder ID',
          }),
        },
      },
    ]);
  });

  test('should disable dropdown when not authenticated', async () => {
    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterBySelection'
    ].options(
      { auth: undefined, useHostSession: { useHostSessionCheckbox: false } },
      context,
    );

    expect(result.disabled).toBe(true);
    expect(result.options).toEqual([]);
    expect(result.placeholder).toEqual('Please authenticate to see filters.');
  });

  test('should return dynamic properties based on selection', async () => {
    const selection = {
      billingAccount: {
        displayName: 'Billing Account',
        description: 'desc',
        required: true,
        type: 'STATIC_DROPDOWN',
        options: { options: [] },
      },
    };

    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterByProperty'
    ].props({ auth: auth, filterBySelection: selection }, context);

    expect(result).toEqual(selection);
  });

  test('should return empty properties if no filterBySelection provided', async () => {
    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterByProperty'
    ].props({ auth: auth }, context);

    expect(result).toEqual({});
  });

  test.each([
    [
      { project: 'proj-123' },
      'gcloud beta recommender recommenders list --format=json --project=proj-123',
    ],
    [
      { organization: 'org-123' },
      'gcloud beta recommender recommenders list --format=json',
    ],
    [
      { folder: 'folder-123' },
      'gcloud beta recommender recommenders list --format=json',
    ],
    [
      { billingAccount: 'billingAccount-123' },
      'gcloud beta recommender recommenders list --format=json',
    ],
  ])(
    'should return recommenders list if authenticated or using host session',
    async (filterByProperty: any, command: string) => {
      const mockOutput = JSON.stringify([
        { name: 'recommender-1' },
        { name: 'recommender-2' },
      ]);

      gcloudCliMock.runCommand.mockResolvedValue(mockOutput);

      const context = createContext({});

      const result = await getRecommendationsAction.props[
        'recommenders'
      ].options(
        {
          auth,
          useHostSession: { useHostSessionCheckbox: true },
          filterByProperty,
        },
        context,
      );

      expect(gcloudCliMock.runCommand).toHaveBeenCalledWith(
        command,
        auth,
        true,
      );

      expect(result).toEqual({
        disabled: false,
        options: [
          { label: 'recommender-1', value: 'recommender-1' },
          { label: 'recommender-2', value: 'recommender-2' },
        ],
      });
    },
  );

  test('should construct and run multiple gcloud commands for recommenders', async () => {
    const context = createContext({
      useHostSession: { useHostSessionCheckbox: true },
      filterByProperty: { billingAccount: '1234' },
      location: 'europe-west1',
      recommenders: ['recommender-1', 'recommender-2'],
    });

    gcloudCliMock.runCommands.mockResolvedValue([
      '{"recommender": "r1"}',
      '{"recommender": "r2"}',
    ]);

    const result = await getRecommendationsAction.run(context);

    expect(gcloudCliMock.runCommands).toHaveBeenCalledTimes(1);
    expect(gcloudCliMock.runCommands).toHaveBeenCalledWith(
      [
        'gcloud recommender recommendations list --format=json --billing-account=1234 --location=europe-west1 --recommender=recommender-1',
        'gcloud recommender recommendations list --format=json --billing-account=1234 --location=europe-west1 --recommender=recommender-2',
      ],
      auth,
      true,
    );

    expect(openOpsMock.tryParseJson).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['{"recommender": "r1"}', '{"recommender": "r2"}']);
  });

  test.each([
    ['billingAccount', '1234', '--billing-account=1234'],
    ['organization', 'org-5678', '--organization=org-5678'],
    ['project', 'proj-9999', '--project=proj-9999'],
    ['folder', 'folder-321', '--folder=folder-321'],
  ])(
    'should build correct command with %s filter',
    async (key, value, expectedFlag) => {
      const context = createContext({
        filterByProperty: { [key]: value },
        recommenders: ['test-recommender'],
        location: 'us-central1',
      });

      gcloudCliMock.runCommands.mockResolvedValue(['{}']);

      await getRecommendationsAction.run(context);

      expect(gcloudCliMock.runCommands).toHaveBeenCalledWith(
        [
          `gcloud recommender recommendations list --format=json ${expectedFlag} --location=us-central1 --recommender=test-recommender`,
        ],
        auth,
        undefined,
      );
    },
  );

  test('should call handleCliError on failure', async () => {
    const context = createContext({
      useHostSession: { useHostSessionCheckbox: false },
      filterByProperty: { folder: 'folder123' },
      location: 'global',
      recommenders: ['recommender-x'],
    });

    const error = new Error('Something went wrong');
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
