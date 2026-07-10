import { WizardConfig } from '@openops/shared';
import { filterWizardConfig } from '../../../src/app/wizard/wizard-config-filter';

const awsLikeConfig = {
  provider: 'aws',
  steps: [
    {
      id: 'connection',
      title: 'c',
      selectionType: 'single',
      nextStep: 'accounts',
    },
    {
      id: 'accounts',
      title: 'a',
      selectionType: 'multi-select',
      selectAll: true,
      conditional: {
        when: 'hasAnyAccounts',
        onSuccess: {
          optionsSource: { type: 'dynamic', method: 'getConnectionAccounts' },
        },
        onFailure: { skipToStep: 'regions' },
      },
      nextStep: 'regions',
    },
    {
      id: 'regions',
      title: 'r',
      selectionType: 'multi-select',
      optionsSource: { type: 'dynamic', method: 'getRegionsList' },
    },
  ],
} as unknown as WizardConfig;

describe('filterWizardConfig', () => {
  it('returns the same config reference when nothing is excluded', () => {
    expect(filterWizardConfig(awsLikeConfig, [])).toBe(awsLikeConfig);
    expect(filterWizardConfig(awsLikeConfig, undefined)).toBe(awsLikeConfig);
  });

  it('removes a tail step and clears pointers that targeted it', () => {
    const filtered = filterWizardConfig(awsLikeConfig, ['regions']);
    expect(filtered.steps.map((s) => s.id)).toEqual(['connection', 'accounts']);
    const accounts = filtered.steps[1];
    expect(accounts.nextStep).toBeUndefined();
    expect(accounts.conditional?.onFailure?.skipToStep).toBeUndefined();
  });

  it('removes a middle step and re-points transitively', () => {
    const filtered = filterWizardConfig(awsLikeConfig, ['accounts']);
    expect(filtered.steps.map((s) => s.id)).toEqual(['connection', 'regions']);
    expect(filtered.steps[0].nextStep).toBe('regions');
  });

  it('removes the first step so navigation starts at the survivor', () => {
    const filtered = filterWizardConfig(awsLikeConfig, ['connection']);
    expect(filtered.steps[0].id).toBe('accounts');
  });

  it('does not mutate the input config', () => {
    const before = JSON.stringify(awsLikeConfig);
    filterWizardConfig(awsLikeConfig, ['regions']);
    expect(JSON.stringify(awsLikeConfig)).toBe(before);
  });

  it('throws on an unknown excluded id', () => {
    expect(() => filterWizardConfig(awsLikeConfig, ['nope'])).toThrow();
  });

  it('throws when every step would be excluded', () => {
    expect(() =>
      filterWizardConfig(awsLikeConfig, ['connection', 'accounts', 'regions']),
    ).toThrow();
  });
});
