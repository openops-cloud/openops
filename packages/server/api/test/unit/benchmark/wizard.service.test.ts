import { getWizardStep } from '../../../src/app/benchmark/wizard.service';

const mockGetWizardConfig = jest.fn();
jest.mock('../../../src/app/benchmark/wizard-config-loader', () => ({
  getWizardConfig: (
    ...args: unknown[]
  ): ReturnType<typeof mockGetWizardConfig> => mockGetWizardConfig(...args),
}));

const MOCK_WIZARD_CONFIG = {
  provider: 'aws',
  steps: [
    {
      id: 'connection',
      title: 'Choose the AWS connection you want to use',
      selectionType: 'single' as const,
      optionsSource: { type: 'dynamic' as const, method: 'listConnections' },
      nextStep: 'accounts',
    },
    {
      id: 'accounts',
      title: 'Which accounts?',
      selectionType: 'multi-select' as const,
      optionsSource: {
        type: 'dynamic' as const,
        method: 'getConnectionAccounts',
      },
      conditional: {
        when: 'connection.supportsMultiAccount',
        skipToStep: 'regions',
      },
      nextStep: 'regions',
    },
    {
      id: 'regions',
      title: 'Which regions?',
      selectionType: 'multi-select' as const,
      optionsSource: {
        type: 'static' as const,
        values: [{ id: 'r1', displayName: 'Region 1' }],
      },
      nextStep: 'services',
    },
    {
      id: 'services',
      title: 'Which services?',
      selectionType: 'multi-select' as const,
      optionsSource: {
        type: 'static' as const,
        values: [{ id: 's1', displayName: 'Service 1' }],
      },
      nextStep: 'create_assessment',
    },
    {
      id: 'create_assessment',
      action: 'import_workflows_and_persist',
    },
  ],
};

describe('getWizardStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWizardConfig.mockReturnValue(MOCK_WIZARD_CONFIG);
  });

  it('returns services step with nextStep null when wizard complete', async () => {
    const result = await getWizardStep('aws', {
      currentStep: 'services',
      benchmarkConfiguration: {
        connection: ['conn-1'],
        regions: ['us-east-1'],
        services: ['unattached-ebs'],
      },
    });
    expect(result.currentStep).toBe('services');
    expect(result.nextStep).toBeNull();
    expect(result.totalSteps).toBe(4);
  });

  it('uses config from loader and returns first step (connection) with stub options', async () => {
    const result = await getWizardStep('aws', {});

    expect(mockGetWizardConfig).toHaveBeenCalledWith('aws');
    expect(result.currentStep).toBe('connection');
    expect(result.title).toContain('AWS connection');
    expect(result.selectionType).toBe('single');
    expect(result.nextStep).toBe('accounts');
    expect(result.options).toEqual([]);
  });

  it('returns regions step after accounts', async () => {
    const result = await getWizardStep('aws', {
      currentStep: 'accounts',
      benchmarkConfiguration: { connection: ['conn-1'], accounts: ['acc-1'] },
    });
    expect(result.currentStep).toBe('regions');
    expect(result.nextStep).toBe('services');
    expect(result.stepIndex).toBe(3);
    expect(result.options).toEqual([]);
  });

  it('returns services step after regions', async () => {
    const result = await getWizardStep('aws', {
      currentStep: 'regions',
      benchmarkConfiguration: {
        connection: ['conn-1'],
        regions: ['us-east-1'],
      },
    });
    expect(result.currentStep).toBe('services');
    expect(result.nextStep).toBeNull();
    expect(result.stepIndex).toBe(4);
    expect(result.options).toEqual([]);
  });

  it('returns stepIndex 1 and totalSteps 4 for first step (connection)', async () => {
    const result = await getWizardStep('aws', {});
    expect(result.stepIndex).toBe(1);
    expect(result.totalSteps).toBe(4);
  });

  it('returns stepIndex 2 and totalSteps 4 for accounts step (after connection)', async () => {
    const result = await getWizardStep('aws', {
      currentStep: 'connection',
      benchmarkConfiguration: { connection: ['conn-1'] },
    });
    expect(result.currentStep).toBe('accounts');
    expect(result.nextStep).toBe('regions');
    expect(result.stepIndex).toBe(2);
    expect(result.totalSteps).toBe(4);
  });

  it('throws when wizard config is not found for provider', async () => {
    mockGetWizardConfig.mockImplementation(() => {
      throw new Error('Wizard config not found for provider: azure');
    });

    await expect(getWizardStep('azure', {})).rejects.toThrow(
      'Wizard config not found for provider: azure',
    );
    expect(mockGetWizardConfig).toHaveBeenCalledWith('azure');
  });

  it('throws for unknown currentStep', async () => {
    await expect(
      getWizardStep('aws', {
        currentStep: 'unknown_step',
        benchmarkConfiguration: {},
      }),
    ).rejects.toThrow('Unknown step: unknown_step');
  });
});
