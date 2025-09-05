import {
  generateApprovalId,
  generateMessageId,
  generateToolId,
} from '../../../src/app/ai/chat/ai-id-generators';

describe('AI ID Generators', () => {
  describe.each([
    { name: 'message', generator: generateMessageId, prefix: 'msg' },
    { name: 'tool', generator: generateToolId, prefix: 'tool' },
    { name: 'approval', generator: generateApprovalId, prefix: 'approval' },
  ])('Generate $name id', ({ generator, prefix }) => {
    it('should have the correct total length', () => {
      const id = generator();
      expect(id.length).toBe(prefix.length + 1 + 24); // prefix + '-' + 24 chars
    });

    it('should generate unique values', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generator());
      }
      expect(ids.size).toBe(1000);
    });

    it('should match expected character pattern', () => {
      const id = generator();
      const pattern = new RegExp(`^${prefix}-[a-z0-9]{24}$`);
      expect(typeof id).toBe('string');
      expect(pattern.test(id)).toBe(true);
    });
  });
});
