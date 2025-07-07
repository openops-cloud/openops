import {
  getBufferAreaHeight,
  getLastUserMessageId,
} from '../ai-scroll-helpers';

describe('getLastUserMessageId', () => {
  it('returns the last user message id', () => {
    const messages = [
      { id: '1', role: 'assistant' },
      { id: '2', role: 'user' },
      { id: '3', role: 'assistant' },
      { id: '4', role: 'user' },
    ];
    expect(getLastUserMessageId(messages)).toBe('4');
  });

  it('returns null if no user message', () => {
    const messages = [
      { id: '1', role: 'assistant' },
      { id: '2', role: 'assistant' },
    ];
    expect(getLastUserMessageId(messages)).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(getLastUserMessageId([])).toBeNull();
  });
});

describe('getBufferAreaHeight', () => {
  it('calculates height for status ready', () => {
    expect(getBufferAreaHeight(500, 100, 50, 30, 'ready')).toBe(190);
  });

  it('calculates height for status streaming', () => {
    expect(getBufferAreaHeight(500, 100, 50, 30, 'streaming')).toBe(210);
  });

  it('calculates height for status submitted', () => {
    expect(getBufferAreaHeight(500, 100, 60, 40, 'submitted')).toBe(200);
  });

  it('calculates height for other status', () => {
    expect(getBufferAreaHeight(500, 200, 60, 40, 'other')).toBe(160);
  });

  it('uses custom readyGap and streamingGap if provided', () => {
    expect(
      getBufferAreaHeight(500, 100, 50, 30, 'ready', { readyGap: 100 }),
    ).toBe(370);
    expect(
      getBufferAreaHeight(500, 100, 50, 30, 'streaming', { streamingGap: 50 }),
    ).toBe(400);
  });

  it('handles undefined status', () => {
    expect(getBufferAreaHeight(500, 100, 50, 30)).toBe(70);
  });

  it('handles negative and zero heights', () => {
    expect(getBufferAreaHeight(0, 0, 0, 0, 'ready')).toBe(32);
    expect(getBufferAreaHeight(-100, -100, -100, -100, 'streaming')).toBe(0);
  });
});
