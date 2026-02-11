import { getWizardStep } from '../../../src/app/benchmark/wizard.service';

const mockGetWizardConfig = jest.fn();
jest.mock('../../../src/app/benchmark/wizard-config-loader', () => ({
  getWizardConfig: (
    ...args: unknown[]
  ): ReturnType<typeof mockGetWizardConfig> => mockGetWizardConfig(...args),
  SUPPORTED_WIZARD_PROVIDERS: new Set(['aws']),
}));

const mockResolveStaticOptions = jest.fn();
const mockResolveListConnectionsOptions = jest.fn();
jest.mock('../../../src/app/benchmark/wizard-option-resolvers', () => ({
  resolveStaticOptions: (
    ...args: unknown[]
  ): ReturnType<typeof mockResolveStaticOptions> =>
    mockResolveStaticOptions(...args),
  resolveListConnectionsOptions: (
    ...args: unknown[]
  ): ReturnType<typeof mockResolveListConnectionsOptions> =>
    mockResolveListConnectionsOptions(...args),
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

const MOCK_CONNECTION_OPTIONS = [
  {
    id: 'conn-1',
    displayName: 'AWS Prod',
    imageLogoUrl: undefined as string | undefined,
    metadata: { authProviderKey: 'aws' },
  },
];
const MOCK_STATIC_OPTIONS = [
  {
    id: 'static-1',
    displayName: 'Static Option',
    imageLogoUrl: undefined as string | undefined,
  },
];

describe('wizard.service', () => {
  const projectId = 'project-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWizardConfig.mockReturnValue(MOCK_WIZARD_CONFIG);
    mockResolveListConnectionsOptions.mockResolvedValue(
      MOCK_CONNECTION_OPTIONS,
    );
    mockResolveStaticOptions.mockReturnValue(MOCK_STATIC_OPTIONS);
  });

  describe('stepIndex and totalSteps (based on optionsSource)', () => {
    it('returns stepIndex 1 and totalSteps 4 for first step (connection)', async () => {
      const result = await getWizardStep('aws', {}, projectId);
      expect(result.stepIndex).toBe(1);
      expect(result.totalSteps).toBe(4);
    });

    it('returns stepIndex 3 and totalSteps 4 for regions step', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'connection',
          benchmarkConfiguration: { connection: ['conn-1'] },
        },
        projectId,
      );
      expect(result.currentStep).toBe('regions');
      expect(result.stepIndex).toBe(3);
      expect(result.totalSteps).toBe(4);
    });

    it('returns stepIndex 4 and totalSteps 4 for services step', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'regions',
          benchmarkConfiguration: {
            connection: ['conn-1'],
            regions: ['us-east-1'],
          },
        },
        projectId,
      );
      expect(result.currentStep).toBe('services');
      expect(result.stepIndex).toBe(4);
      expect(result.totalSteps).toBe(4);
    });

    it('keeps stepIndex 4 and totalSteps 4 when wizard complete (nextStep null)', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'services',
          benchmarkConfiguration: {
            connection: ['conn-1'],
            regions: ['us-east-1'],
            services: ['unattached-ebs'],
          },
        },
        projectId,
      );
      expect(result.nextStep).toBeNull();
      expect(result.stepIndex).toBe(4);
      expect(result.totalSteps).toBe(4);
    });
  });

  describe('config load for aws', () => {
    it('uses config from loader and returns first step (connection) with options', async () => {
      const result = await getWizardStep('aws', {}, projectId);

      expect(mockGetWizardConfig).toHaveBeenCalledWith('aws');
      expect(result.currentStep).toBe('connection');
      expect(result.title).toContain('AWS connection');
      expect(result.selectionType).toBe('single');
      expect(result.nextStep).toBe('regions'); // accounts skipped
      expect(mockResolveListConnectionsOptions).toHaveBeenCalledWith(
        'aws',
        projectId,
      );
      expect(result.options).toEqual(MOCK_CONNECTION_OPTIONS);
    });
  });

  describe('option resolution', () => {
    it('calls resolveStaticOptions for regions step and returns its result', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'connection',
          benchmarkConfiguration: { connection: ['conn-1'] },
        },
        projectId,
      );

      expect(result.currentStep).toBe('regions');
      expect(result.selectionType).toBe('multi-select');
      expect(mockResolveStaticOptions).toHaveBeenCalled();
      expect(result.options).toEqual(MOCK_STATIC_OPTIONS);
    });

    it('calls resolveStaticOptions for services step and returns its result', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'regions',
          benchmarkConfiguration: {
            connection: ['conn-1'],
            regions: ['us-east-1'],
          },
        },
        projectId,
      );

      expect(result.currentStep).toBe('services');
      expect(result.selectionType).toBe('multi-select');
      expect(mockResolveStaticOptions).toHaveBeenCalled();
      expect(result.options).toEqual(MOCK_STATIC_OPTIONS);
    });
  });

  describe('conditional skip (accounts)', () => {
    it('skips accounts step: after connection, next step is regions', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'connection',
          benchmarkConfiguration: { connection: ['conn-1'] },
        },
        projectId,
      );

      expect(result.currentStep).toBe('regions');
      expect(result.nextStep).toBe('services');
    });
  });

  describe('nextStep: null when wizard complete', () => {
    it('returns nextStep null when user has completed services step', async () => {
      const result = await getWizardStep(
        'aws',
        {
          currentStep: 'services',
          benchmarkConfiguration: {
            connection: ['conn-1'],
            regions: ['us-east-1'],
            services: ['unattached-ebs'],
          },
        },
        projectId,
      );

      expect(result.currentStep).toBe('services');
      expect(result.nextStep).toBeNull();
      expect(result.options).toEqual(MOCK_STATIC_OPTIONS);
    });
  });

  describe('unsupported provider', () => {
    it('throws for unsupported provider', async () => {
      await expect(getWizardStep('azure', {}, projectId)).rejects.toThrow(
        'Unsupported wizard provider: azure',
      );
      expect(mockGetWizardConfig).not.toHaveBeenCalled();
      expect(mockResolveListConnectionsOptions).not.toHaveBeenCalled();
      expect(mockResolveStaticOptions).not.toHaveBeenCalled();
    });
  });

  describe('unknown step', () => {
    it('throws for unknown currentStep', async () => {
      await expect(
        getWizardStep(
          'aws',
          { currentStep: 'unknown_step', benchmarkConfiguration: {} },
          projectId,
        ),
      ).rejects.toThrow('Unknown step: unknown_step');
    });
  });
});
