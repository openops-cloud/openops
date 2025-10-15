import { parseCodeBlockMetadata } from '../markdown-metadata-parser';

describe('parseCodeBlockMetadata', () => {
  describe('height parsing', () => {
    it('should parse h-XXX pattern and convert to pixels', () => {
      const result = parseCodeBlockMetadata('language-graphql h-150');
      expect(result.height).toBe('150px');
    });

    it('should parse h pattern at the start of className', () => {
      const result = parseCodeBlockMetadata('h-200 language-json');
      expect(result.height).toBe('200px');
    });

    it('should parse h pattern in the middle of className', () => {
      const result = parseCodeBlockMetadata(
        'language-typescript h-300 some-other-class',
      );
      expect(result.height).toBe('300px');
    });

    it('should handle large height values', () => {
      const result = parseCodeBlockMetadata('language-javascript h-1000');
      expect(result.height).toBe('1000px');
    });

    it('should return undefined height when pattern is not found', () => {
      const result = parseCodeBlockMetadata('language-json');
      expect(result.height).toBeUndefined();
    });

    it('should return undefined height for invalid pattern', () => {
      const result = parseCodeBlockMetadata('language-json h-');
      expect(result.height).toBeUndefined();
    });

    it('should return undefined height for non-numeric value', () => {
      const result = parseCodeBlockMetadata('language-json h-abc');
      expect(result.height).toBeUndefined();
    });

    it('should work with any numeric value (dynamic heights)', () => {
      const result140 = parseCodeBlockMetadata('language-graphql h-140');
      expect(result140.height).toBe('140px');

      const result275 = parseCodeBlockMetadata('language-graphql h-275');
      expect(result275.height).toBe('275px');
    });

    it('should use word boundary to avoid matching other patterns', () => {
      // Should not match "height" or "hash"
      const result = parseCodeBlockMetadata('language-graphql hash-123');
      expect(result.height).toBeUndefined();
    });
  });
});
