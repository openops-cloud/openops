import { generateMessageId } from '../../../src/app/ai/chat/ai-message-id-generator';

describe('Generate message id', () => {
  it('should have the correct total length', () => {
    const id = generateMessageId();
    expect(id.length).toBe(4 + 24);
  });

  it('should generate unique values', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateMessageId());
    }
    expect(ids.size).toBe(1000);
  });

  it('should match expected character pattern', () => {
    const id = generateMessageId();
    const pattern = /^msg-[a-z0-9]{24}$/;
    expect(typeof id).toBe('string');
    expect(pattern.test(id)).toBe(true);
  });
});
