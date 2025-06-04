import { replaceServicePrefix } from '../template-utils';

describe('replaceServicePrefix', () => {
  it.each([
    [undefined, ''],
    ['', ''],
    ['   ', '   '],
    ['AWS EC2', 'EC2'],
    ['GCP BigQuery', 'BigQuery'],
    ['Azure Cosmos DB', 'Cosmos DB'],
    ['AWS   Lambda', 'Lambda'],
    ['AWS', 'AWS'],
    ['DigitalOcean Spaces', 'DigitalOcean Spaces'],
    ['EC2', 'EC2'],
    ['AWS-EC2', 'AWS-EC2'],
  ])('replaces "%s" with "%s"', (input, expected) => {
    expect(replaceServicePrefix(input)).toBe(expected);
  });
});
