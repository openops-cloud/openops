import { addIntegrationsToTemplates } from '../templates-utils';

const makeTemplate = (partial: Partial<any> = {}): any => ({
  name: 'dummy',
  type: 'dummy',
  tags: [],
  domains: [],
  updated: '',
  description: '',
  blocks: [],
  isSample: false,
  isGettingStarted: false,
  ...partial,
});

describe('addIntegrationsToTemplates', () => {
  it('maps block names to integrations using the lookup', () => {
    const templates = [
      makeTemplate({ name: 't1', blocks: ['blockA', 'blockB'] }),
      makeTemplate({ name: 't2', blocks: ['blockB'] }),
    ];

    const lookup = {
      blockA: { name: 'A', displayName: 'Block A' },
      blockB: { name: 'B', displayName: 'Block B' },
    } as Record<string, any>;

    const result = addIntegrationsToTemplates(templates, lookup);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      name: 't1',
      integrations: [lookup.blockA, lookup.blockB],
    });
    expect(result[1]).toMatchObject({
      name: 't2',
      integrations: [lookup.blockB],
    });
  });

  it('filters out missing integrations from the lookup', () => {
    const templates = [
      makeTemplate({ blocks: ['exists', 'missing', 'also-missing'] }),
    ];
    const lookup = { exists: { key: 'exists' } } as Record<string, any>;

    const result = addIntegrationsToTemplates(templates, lookup);

    expect(result[0].integrations).toEqual([lookup.exists]);
  });

  it('handles templates with undefined or empty blocks by setting empty integrations', () => {
    const templates = [
      makeTemplate({ name: 't1', blocks: undefined }),
      makeTemplate({ name: 't2', blocks: [] }),
    ];

    const result = addIntegrationsToTemplates(templates, {});

    expect(result[0].integrations).toEqual([]);
    expect(result[1].integrations).toEqual([]);
  });

  it('returns an empty array when no templates are provided', () => {
    const result = addIntegrationsToTemplates([], {});
    expect(result).toEqual([]);
  });

  it('does not mutate the original templates array or its items', () => {
    const originalTemplates = [
      makeTemplate({ name: 'immutable', blocks: ['x'] }),
    ];
    const templatesCopy = JSON.parse(JSON.stringify(originalTemplates));

    const lookup = { x: { name: 'X' } } as Record<string, any>;

    const result = addIntegrationsToTemplates(originalTemplates, lookup);

    // Ensure original is unchanged
    expect(originalTemplates).toEqual(templatesCopy);

    // Ensure result contains integrations and is a different reference
    expect(result).not.toBe(originalTemplates);
    expect(result[0]).not.toBe(originalTemplates[0]);
    expect(result[0].integrations).toEqual([lookup.x]);
  });
});
