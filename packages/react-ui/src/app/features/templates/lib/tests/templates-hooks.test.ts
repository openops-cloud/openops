import { getUniqueCategoriesFromTemplates } from '../templates-hooks';

const makeTemplate = (partial: Partial<any>): any => ({
  name: 'dummy',
  type: 'dummy',
  tags: [],
  domains: [],
  updated: '',
  description: '',
  blocks: [],
  pieces: [],
  isSample: false,
  isGettingStarted: false,
  ...partial,
});

describe('getUniqueCategoriesFromTemplates', () => {
  it.each([
    {
      input: undefined,
      expected: [],
      desc: 'returns an empty array if no templates are provided (undefined)',
    },
    {
      input: [],
      expected: [],
      desc: 'returns an empty array if no templates are provided (empty array)',
    },
    {
      input: [makeTemplate({ categories: ['AWS'], services: ['EC2'] })],
      expected: [{ name: 'AWS', services: ['EC2'] }],
      desc: 'handles a single template with one category and one service',
    },
    {
      input: [
        makeTemplate({ categories: ['AWS'], services: ['EC2'] }),
        makeTemplate({ categories: ['AWS'], services: ['S3'] }),
        makeTemplate({ categories: ['AWS'], services: ['EC2', 'RDS'] }),
      ],
      expected: [{ name: 'AWS', services: ['EC2', 'RDS', 'S3'] }],
      desc: 'merges services for the same category from multiple templates',
    },
    {
      input: [
        makeTemplate({
          categories: ['Azure', 'AWS'],
          services: ['Service Bus'],
        }),
        makeTemplate({ categories: ['GCP'], services: ['BigQuery'] }),
      ],
      expected: [
        { name: 'AWS', services: ['Service Bus'] },
        { name: 'Azure', services: ['Service Bus'] },
        { name: 'GCP', services: ['BigQuery'] },
      ],
      desc: 'handles multiple categories and sorts them',
    },
    {
      input: [
        makeTemplate({
          categories: ['Azure'],
          services: ['Cosmos DB', 'Service Bus', 'Service Bus'],
        }),
        makeTemplate({
          categories: ['Azure'],
          services: ['Cosmos DB', 'App Service'],
        }),
      ],
      expected: [
        {
          name: 'Azure',
          services: ['App Service', 'Cosmos DB', 'Service Bus'],
        },
      ],
      desc: 'deduplicates services and sorts them',
    },
    {
      input: [makeTemplate({ categories: [''], services: ['EC2'] })],
      expected: [],
      desc: 'handles a template with an empty category',
    },
    {
      input: [makeTemplate({ categories: ['AWS'], services: [] })],
      expected: [{ name: 'AWS', services: [] }],
      desc: 'handles a category with empty services',
    },
    {
      input: [makeTemplate({ categories: ['AWS', ''], services: [] })],
      expected: [{ name: 'AWS', services: [] }],
      desc: 'handles multiple categories including an empty one, all with empty services',
    },
  ])('$desc', ({ input, expected }) => {
    expect(getUniqueCategoriesFromTemplates(input)).toEqual(expected);
  });
});
