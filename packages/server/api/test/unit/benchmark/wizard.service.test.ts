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
      title: 'Select last options',
      selectionType: 'multi-select' as const,
      optionsSource: {
        type: 'static' as const,
        values: [{ id: 'opt1', displayName: 'Option 1' }],
      },
    },
  ],
};

const mockProviderAdapter: ProviderAdapter = {
  config: MOCK_WIZARD_CONFIG,
  resolveOptions: mockResolveOptions,
  evaluateCondition: mockEvaluateCondition,
};

const adapters = new Map<string, ProviderAdapter>();
adapters.set('test', mockProviderAdapter);

const mockGetProvider = jest.fn((provider: string): ProviderAdapter => {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`Provider not found: ${provider}`);
  }
  return adapter;
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
    expect(result.options).toEqual([{ id: 'opt1', displayName: 'Option 1' }]);
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

  describe('selectAll', () => {
    it('returns preselectedOptions with all option ids when selectAll is true and options exist', async () => {
      const selectAllConfig = {
        provider: 'selectall',
        steps: [
          {
            id: 'step1',
            title: 'Pick all',
            selectionType: 'multi-select' as const,
            selectAll: true,
            optionsSource: {
              type: 'static' as const,
              values: [
                { id: 'opt1', displayName: 'Option 1' },
                { id: 'opt2', displayName: 'Option 2' },
              ],
            },
          },
        ],
      };
      const selectAllAdapter: ProviderAdapter = {
        config: selectAllConfig,
        resolveOptions: mockResolveOptions,
        evaluateCondition: mockEvaluateCondition,
      };
      adapters.set('selectall', selectAllAdapter);

      try {
        const result = await resolveWizardNavigation(
          'selectall',
          {},
          TEST_PROJECT_ID,
        );
        expect(result.preselectedOptions).toEqual(['opt1', 'opt2']);
      } finally {
        adapters.delete('selectall');
      }
    });

    it('returns preselectedOptions as undefined when selectAll is true but options are empty', async () => {
      const selectAllEmptyConfig = {
        provider: 'selectall-empty',
        steps: [
          {
            id: 'step1',
            title: 'Pick all',
            selectionType: 'multi-select' as const,
            selectAll: true,
            optionsSource: { type: 'dynamic' as const, method: 'listOptions' },
          },
        ],
      };
      mockResolveOptions.mockResolvedValue([]);
      const selectAllEmptyAdapter: ProviderAdapter = {
        config: selectAllEmptyConfig,
        resolveOptions: mockResolveOptions,
        evaluateCondition: mockEvaluateCondition,
      };
      adapters.set('selectall-empty', selectAllEmptyAdapter);

      try {
        const result = await resolveWizardNavigation(
          'selectall-empty',
          {},
          TEST_PROJECT_ID,
        );
        expect(result.preselectedOptions).toBeUndefined();
      } finally {
        adapters.delete('selectall-empty');
      }
    });

    it('returns preselectedOptions as undefined when selectAll is not set', async () => {
      const result = await resolveWizardNavigation('test', {}, TEST_PROJECT_ID);
      expect(result.preselectedOptions).toBeUndefined();
    });
  });

  it('throws when conditional step is not last step and onFailure.skipToStep is not set', async () => {
    mockEvaluateCondition.mockResolvedValue(false);
    const misconfigConfig = {
      provider: 'misconfig' as const,
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
    const misconfigAdapter: ProviderAdapter = {
      config: misconfigConfig,
      resolveOptions: mockResolveOptions,
      evaluateCondition: mockEvaluateCondition,
    };
    adapters.set('misconfig', misconfigAdapter);
    try {
      await expect(
        resolveWizardNavigation(
          'misconfig',
          { currentStep: 'a' },
          TEST_PROJECT_ID,
        ),
      ).rejects.toThrow(
        /Conditional step "b" must set onFailure\.skipToStep when it is not the last step/,
      );
    } finally {
      adapters.delete('misconfig');
    }
  });
});
