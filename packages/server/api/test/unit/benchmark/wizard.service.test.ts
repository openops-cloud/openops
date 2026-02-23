import type { ProviderAdapter } from '../../../src/app/benchmark/provider-adapter';
import { resolveWizardNavigation } from '../../../src/app/benchmark/wizard.service';

jest.mock('../../../src/app/benchmark/register-providers', () => ({}));

const mockResolveOptions = jest.fn().mockResolvedValue([]);
const mockEvaluateCondition = jest.fn().mockResolvedValue(true);

const MOCK_WIZARD_CONFIG = {
  provider: 'test',
  steps: [
    {
      id: 'step1',
      title: 'Select first option',
      selectionType: 'single' as const,
      optionsSource: { type: 'dynamic' as const, method: 'listOptions' },
      nextStep: 'step2',
    },
    {
      id: 'step2',
      title: 'Select second options',
      selectionType: 'multi-select' as const,
      optionsSource: {
        type: 'dynamic' as const,
        method: 'getOptions',
      },
      conditional: {
        when: 'step1.supportsMulti',
        skipToStep: 'step3',
        onSuccess: {
          optionsSource: { type: 'dynamic' as const, method: 'getOptions' },
        },
        onFailure: { skipToStep: 'step3' },
      },
      nextStep: 'step3',
    },
    {
      id: 'step3',
      title: 'Select third options',
      selectionType: 'multi-select' as const,
      optionsSource: {
        type: 'static' as const,
        values: [{ id: 'opt1', displayName: 'Option 1' }],
      },
      nextStep: 'last_step',
    },
    {
      id: 'last_step',
      title: 'Select fourth options',
      selectionType: 'multi-select' as const,
      optionsSource: {
        type: 'static' as const,
        values: [{ id: 'opt2', displayName: 'Option 2' }],
      },
    },
  ],
};

const mockProviderAdapter: ProviderAdapter = {
  config: MOCK_WIZARD_CONFIG,
  resolveOptions: mockResolveOptions,
  evaluateCondition: mockEvaluateCondition,
};

const mockGetProvider = jest.fn((provider: string): ProviderAdapter => {
  if (provider === 'test') {
    return mockProviderAdapter;
  }
  throw new Error(`Provider not found: ${provider}`);
});

jest.mock('../../../src/app/benchmark/provider-adapter', () => ({
  ...jest.requireActual('../../../src/app/benchmark/provider-adapter'),
  getProvider: (p: string): ProviderAdapter => mockGetProvider(p),
}));

const TEST_PROJECT_ID = 'test-project-id';

describe('resolveWizardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveOptions.mockResolvedValue([]);
    mockEvaluateCondition.mockResolvedValue(true);
  });

  it('returns last_step with nextStep null when wizard complete', async () => {
    const result = await resolveWizardNavigation(
      'test',
      { currentStep: 'last_step' },
      TEST_PROJECT_ID,
    );
    expect(result.currentStep).toBe('last_step');
    expect(result.nextStep).toBeNull();
    expect(result.totalSteps).toBe(4);
  });

  it('uses provider adapter config and returns first step with dynamic options', async () => {
    const result = await resolveWizardNavigation('test', {}, TEST_PROJECT_ID);

    expect(mockGetProvider).toHaveBeenCalledWith('test');
    expect(result.currentStep).toBe('step1');
    expect(result.title).toContain('first');
    expect(result.selectionType).toBe('single');
    expect(result.nextStep).toBe('step2');
    expect(result.options).toEqual([]);
    expect(mockResolveOptions).toHaveBeenCalledWith(
      'listOptions',
      expect.objectContaining({
        projectId: TEST_PROJECT_ID,
        provider: 'test',
      }),
    );
  });

  it('returns step3 after step2 with static options', async () => {
    const result = await resolveWizardNavigation(
      'test',
      { currentStep: 'step2' },
      TEST_PROJECT_ID,
    );
    expect(result.currentStep).toBe('step3');
    expect(result.nextStep).toBe('last_step');
    expect(result.stepIndex).toBe(3);
    expect(result.options).toEqual([{ id: 'opt1', displayName: 'Option 1' }]);
  });

  it('returns last_step after step3 with static options', async () => {
    const result = await resolveWizardNavigation(
      'test',
      { currentStep: 'step3' },
      TEST_PROJECT_ID,
    );
    expect(result.currentStep).toBe('last_step');
    expect(result.nextStep).toBeNull();
    expect(result.stepIndex).toBe(4);
    expect(result.options).toEqual([{ id: 'opt2', displayName: 'Option 2' }]);
  });

  it('returns stepIndex 1 and totalSteps 4 for first step', async () => {
    const result = await resolveWizardNavigation('test', {}, TEST_PROJECT_ID);
    expect(result.stepIndex).toBe(1);
    expect(result.totalSteps).toBe(4);
  });

  it('returns stepIndex 2 and totalSteps 4 for step2 (after step1)', async () => {
    const result = await resolveWizardNavigation(
      'test',
      { currentStep: 'step1' },
      TEST_PROJECT_ID,
    );
    expect(result.currentStep).toBe('step2');
    expect(result.nextStep).toBe('step3');
    expect(result.stepIndex).toBe(2);
    expect(result.totalSteps).toBe(4);
  });

  it('throws when provider is not found', async () => {
    await expect(
      resolveWizardNavigation('unknown', {}, TEST_PROJECT_ID),
    ).rejects.toThrow('Provider not found: unknown');
    expect(mockGetProvider).toHaveBeenCalledWith('unknown');
  });

  it('throws for unknown currentStep', async () => {
    await expect(
      resolveWizardNavigation(
        'test',
        { currentStep: 'unknown_step' },
        TEST_PROJECT_ID,
      ),
    ).rejects.toThrow('Unknown step: unknown_step');
  });

  describe('conditional logic', () => {
    it('skips conditional step when condition is false and onFailure.skipToStep is set', async () => {
      mockEvaluateCondition.mockResolvedValue(false);

      const result = await resolveWizardNavigation(
        'test',
        { currentStep: 'step1' },
        TEST_PROJECT_ID,
      );

      expect(result.currentStep).toBe('step3');
      expect(result.nextStep).toBe('last_step');
      expect(mockEvaluateCondition).toHaveBeenCalledWith(
        'step1.supportsMulti',
        expect.objectContaining({
          projectId: TEST_PROJECT_ID,
          provider: 'test',
        }),
      );
    });

    it('shows conditional step when condition is true', async () => {
      mockEvaluateCondition.mockResolvedValue(true);

      const result = await resolveWizardNavigation(
        'test',
        { currentStep: 'step1' },
        TEST_PROJECT_ID,
      );

      expect(result.currentStep).toBe('step2');
      expect(result.nextStep).toBe('step3');
      expect(mockEvaluateCondition).toHaveBeenCalledWith(
        'step1.supportsMulti',
        expect.any(Object),
      );
    });

    it('passes benchmarkConfiguration in context to evaluateCondition', async () => {
      mockEvaluateCondition.mockResolvedValue(true);

      await resolveWizardNavigation(
        'test',
        {
          currentStep: 'step1',
          benchmarkConfiguration: { connection: ['conn-1'] },
        },
        TEST_PROJECT_ID,
      );

      expect(mockEvaluateCondition).toHaveBeenCalledWith(
        'step1.supportsMulti',
        expect.objectContaining({
          benchmarkConfiguration: { connection: ['conn-1'] },
          projectId: TEST_PROJECT_ID,
          provider: 'test',
        }),
      );
    });

    it('stays on current step when condition is false and onFailure.skipToStep is not set', async () => {
      mockEvaluateCondition.mockResolvedValue(false);
      const configWithNoSkip = {
        provider: 'test' as const,
        steps: [
          {
            id: 'a',
            title: 'Step A',
            selectionType: 'single' as const,
            optionsSource: { type: 'dynamic' as const, method: 'listA' },
            nextStep: 'b',
          },
          {
            id: 'b',
            title: 'Step B',
            selectionType: 'single' as const,
            conditional: {
              when: 'showB',
              skipToStep: 'c',
              onSuccess: {
                optionsSource: {
                  type: 'static' as const,
                  values: [{ id: 'b1', displayName: 'B1' }],
                },
              },
              onFailure: {},
            },
            nextStep: 'c',
          },
          {
            id: 'c',
            title: 'Step C',
            selectionType: 'single' as const,
            optionsSource: {
              type: 'static' as const,
              values: [{ id: 'c1', displayName: 'C1' }],
            },
          },
        ],
      };
      const noSkipAdapter: ProviderAdapter = {
        config: configWithNoSkip,
        resolveOptions: mockResolveOptions,
        evaluateCondition: mockEvaluateCondition,
      };
      const originalGetProvider = mockGetProvider.getMockImplementation();
      mockGetProvider.mockImplementation((p: string) => {
        if (p === 'no-skip') {
          return noSkipAdapter;
        }
        return originalGetProvider?.(p) ?? mockProviderAdapter;
      });

      const result = await resolveWizardNavigation(
        'no-skip',
        { currentStep: 'a' },
        TEST_PROJECT_ID,
      );

      expect(result.currentStep).toBe('a');
      expect(result.nextStep).toBeNull();
      mockGetProvider.mockImplementation(
        originalGetProvider ?? (() => mockProviderAdapter),
      );
    });

    it('chains conditionals: skips multiple steps when both conditions are false', async () => {
      mockEvaluateCondition.mockResolvedValue(false);
      const chainedConfig = {
        provider: 'chained' as const,
        steps: [
          {
            id: 'connection',
            title: 'Connection',
            selectionType: 'single' as const,
            optionsSource: {
              type: 'dynamic' as const,
              method: 'listConnections',
            },
            nextStep: 'accounts',
          },
          {
            id: 'accounts',
            title: 'Accounts',
            selectionType: 'multi-select' as const,
            conditional: {
              when: 'hasMultipleAccounts',
              skipToStep: 'regions',
              onSuccess: {
                optionsSource: {
                  type: 'dynamic' as const,
                  method: 'getAccounts',
                },
              },
              onFailure: { skipToStep: 'regions' },
            },
            nextStep: 'regions',
          },
          {
            id: 'regions',
            title: 'Regions',
            selectionType: 'multi-select' as const,
            conditional: {
              when: 'hasMultipleRegions',
              skipToStep: 'workflows',
              onSuccess: {
                optionsSource: {
                  type: 'dynamic' as const,
                  method: 'getRegions',
                },
              },
              onFailure: { skipToStep: 'workflows' },
            },
            nextStep: 'workflows',
          },
          {
            id: 'workflows',
            title: 'Workflows',
            selectionType: 'multi-select' as const,
            optionsSource: {
              type: 'static' as const,
              values: [{ id: 'w1', displayName: 'Workflow 1' }],
            },
          },
        ],
      };
      const chainedAdapter: ProviderAdapter = {
        config: chainedConfig,
        resolveOptions: mockResolveOptions,
        evaluateCondition: mockEvaluateCondition,
      };
      const originalGetProvider = mockGetProvider.getMockImplementation();
      mockGetProvider.mockImplementation((p: string) => {
        if (p === 'chained') {
          return chainedAdapter;
        }
        return originalGetProvider?.(p) ?? mockProviderAdapter;
      });

      const result = await resolveWizardNavigation(
        'chained',
        { currentStep: 'connection' },
        TEST_PROJECT_ID,
      );

      expect(result.currentStep).toBe('workflows');
      expect(mockEvaluateCondition).toHaveBeenCalledWith(
        'hasMultipleAccounts',
        expect.any(Object),
      );
      expect(mockEvaluateCondition).toHaveBeenCalledWith(
        'hasMultipleRegions',
        expect.any(Object),
      );
      mockGetProvider.mockImplementation(
        originalGetProvider ?? (() => mockProviderAdapter),
      );
    });
  });
});
