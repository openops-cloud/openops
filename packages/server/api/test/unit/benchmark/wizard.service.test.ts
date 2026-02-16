import { resolveWizardNavigation } from '../../../src/app/benchmark/wizard.service';

const mockGetWizardConfig = jest.fn();
jest.mock('../../../src/app/benchmark/wizard-config-loader', () => ({
  getWizardConfig: (
    ...args: unknown[]
  ): ReturnType<typeof mockGetWizardConfig> => mockGetWizardConfig(...args),
}));

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

describe('resolveWizardNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWizardConfig.mockReturnValue(MOCK_WIZARD_CONFIG);
  });

  it('returns last_step with nextStep null when wizard complete', async () => {
    const result = await resolveWizardNavigation('test', {
      currentStep: 'last_step',
    });
    expect(result.currentStep).toBe('last_step');
    expect(result.nextStep).toBeNull();
    expect(result.totalSteps).toBe(4);
  });

  it('uses config from loader and returns first step with stub options', async () => {
    const result = await resolveWizardNavigation('test', {});

    expect(mockGetWizardConfig).toHaveBeenCalledWith('test');
    expect(result.currentStep).toBe('step1');
    expect(result.title).toContain('first');
    expect(result.selectionType).toBe('single');
    expect(result.nextStep).toBe('step2');
    expect(result.options).toEqual([]);
  });

  it('returns step3 after step2', async () => {
    const result = await resolveWizardNavigation('test', {
      currentStep: 'step2',
    });
    expect(result.currentStep).toBe('step3');
    expect(result.nextStep).toBe('last_step');
    expect(result.stepIndex).toBe(3);
    expect(result.options).toEqual([]);
  });

  it('returns last_step after step3', async () => {
    const result = await resolveWizardNavigation('test', {
      currentStep: 'step3',
    });
    expect(result.currentStep).toBe('last_step');
    expect(result.nextStep).toBeNull();
    expect(result.stepIndex).toBe(4);
    expect(result.options).toEqual([]);
  });

  it('returns stepIndex 1 and totalSteps 4 for first step', async () => {
    const result = await resolveWizardNavigation('test', {});
    expect(result.stepIndex).toBe(1);
    expect(result.totalSteps).toBe(4);
  });

  it('returns stepIndex 2 and totalSteps 4 for step2 (after step1)', async () => {
    const result = await resolveWizardNavigation('test', {
      currentStep: 'step1',
    });
    expect(result.currentStep).toBe('step2');
    expect(result.nextStep).toBe('step3');
    expect(result.stepIndex).toBe(2);
    expect(result.totalSteps).toBe(4);
  });

  it('throws when wizard config is not found for provider', async () => {
    mockGetWizardConfig.mockImplementation(() => {
      throw new Error('Wizard config not found for provider: unknown');
    });

    await expect(resolveWizardNavigation('unknown', {})).rejects.toThrow(
      'Wizard config not found for provider: unknown',
    );
    expect(mockGetWizardConfig).toHaveBeenCalledWith('unknown');
  });

  it('throws for unknown currentStep', async () => {
    await expect(
      resolveWizardNavigation('test', { currentStep: 'unknown_step' }),
    ).rejects.toThrow('Unknown step: unknown_step');
  });
});
