import { optscale } from '../src/index';

describe('block declaration tests', () => {
  test('should return block with correct metadata', () => {
    expect(optscale.displayName).toBe('OptScale');
    expect(optscale.logoUrl).toBe('/blocks/optscale.svg');
  });
});
