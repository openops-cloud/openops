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

  test('should exclude blocked recommenders from dropdown', async () => {
    const context = createContext({});

    const allRecommenders = [
      { name: 'google.accounts.security.SecurityKeyRecommender' },
      { name: 'google.bigquery.jobs.ErrorMitigationRecommender' },
      {
        name: 'google.cloudbilling.commitment.SpendBasedCommitmentRecommender',
      },
      { name: 'google.cloudplatform.productledgrowth.Recommender' },
      { name: 'google.composer.environment.Recommender' },
      { name: 'google.di.productx.Recommender' },
      { name: 'google.compute.instance.IdleResourceRecommender' },
      { name: 'google.iam.policy.LintRecommender' },
    ];

    gcloudCliMock.runCommand.mockResolvedValueOnce(
      JSON.stringify(allRecommenders),
    );

    const recommenderOptions = await getRecommendationsAction.props[
      'recommenders'
    ].options(
      {
        auth,
        useHostSession: { useHostSessionCheckbox: true },
      },
      context,
    );

    const labels = recommenderOptions.options.map((opt: any) => opt.label);
    expect(labels).toContain('google.compute.instance.IdleResourceRecommender');
    expect(labels).toContain('google.iam.policy.LintRecommender');

    expect(labels).not.toContain(
      'google.accounts.security.SecurityKeyRecommender',
    );
    expect(labels).not.toContain(
      'google.bigquery.jobs.ErrorMitigationRecommender',
    );
    expect(labels).not.toContain(
      'google.cloudbilling.commitment.SpendBasedCommitmentRecommender',
    );
    expect(labels).not.toContain(
      'google.cloudplatform.productledgrowth.Recommender',
    );
    expect(labels).not.toContain('google.composer.environment.Recommender');
    expect(labels).not.toContain('google.di.productx.Recommender');
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

    expect(result['markdown']).toMatchObject({
      type: 'MARKDOWN',
      description: 'Please authenticate to see the filter options.',
    });
  });

  test('should return markdown property if no filterBySelection is selected', async () => {
    const context = createContext({});

    const result = await getRecommendationsAction.props[
      'filterByProperty'
    ].props(
      {
        auth,
        useHostSession: { useHostSessionCheckbox: true },
        filterBySelection: undefined as any,
      },
      context,
    );

    expect(result).toMatchObject({
      markdown: {
        type: 'MARKDOWN',
        description:
          'Please select a filter from the dropdown to see the options.',
      },
    });
  });

  test.each([
    [
      {
        type: 'billingAccount',
        command: 'gcloud billing accounts list --format=json',
        expected: {
          displayName: 'Billing Account',
          type: 'STATIC_DROPDOWN',
        },
        mockResponse: [
          { name: 'billingAccounts/abc', displayName: 'Billing 1' },
        ],
      },
    ],
    [
      {
        type: 'organization',
        command: 'gcloud organizations list --format=json',
        expected: {
          displayName: 'Organization ID',
          type: 'STATIC_DROPDOWN',
        },
        mockResponse: [{ name: 'organizations/789', displayName: 'Org A' }],
      },
    ],
    [
      {
        type: 'project',
        command: 'gcloud projects list --format=json',
        expected: {
          displayName: 'Project ID',
          type: 'STATIC_DROPDOWN',
        },
        mockResponse: [{ name: 'My Project', projectId: 'proj-1' }],
      },
    ],
  ])(
    `should return dynamic dropdown property for %p`,
    async ({ type, command, expected, mockResponse }) => {
      const context = createContext({});
      gcloudCliMock.runCommand.mockResolvedValueOnce(
        JSON.stringify(mockResponse),
      );

      const result = await getRecommendationsAction.props[
        'filterByProperty'
      ].props(
        {
          auth,
          useHostSession: { useHostSessionCheckbox: true },
          filterBySelection: type as any,
        },
        context,
      );

      expect(result[type]).toMatchObject(expected);
      expect(gcloudCliMock.runCommand).toHaveBeenCalledWith(
        command,
        auth,
        true,
      );
    },
  );

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

  test.each([
    {
      name: 'one empty and one with multiple results',
      recommenders: ['recommender-empty', 'recommender-multi'],
      cliResponses: ['[]', '[{"name":"r1"}, {"name":"r2"}]'],
      expected: [
        { name: 'r1', source: 'recommender-multi' },
        { name: 'r2', source: 'recommender-multi' },
      ],
    },
    {
      name: 'both recommenders return results',
      recommenders: ['rec-a', 'rec-b'],
      cliResponses: ['[{"name":"a1"}]', '[{"name":"b1"}]'],
      expected: [
        { name: 'a1', source: 'rec-a' },
        { name: 'b1', source: 'rec-b' },
      ],
    },
    {
      name: 'both recommenders return empty',
      recommenders: ['rec-x', 'rec-y'],
      cliResponses: ['[]', '[]'],
      expected: [],
    },
  ])(
    'should flatten results correctly when $name',
    async ({ recommenders, cliResponses, expected }) => {
      const context = createContext({
        useHostSession: { useHostSessionCheckbox: true },
        filterByProperty: { organization: 'org-test' },
        location: 'global',
        recommenders,
      });

      gcloudCliMock.runCommands.mockResolvedValueOnce(cliResponses);

      const result = await getRecommendationsAction.run(context);

      expect(result).toEqual(expected);
    },
  );

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
