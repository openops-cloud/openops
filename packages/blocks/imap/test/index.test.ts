import { imapBlock } from '../src/index';

describe('block declaration tests', () => {
  test('should return correct display name', () => {
    expect(imapBlock.displayName).toEqual('IMAP');
  });

  test('should return correct actions', () => {
    expect(Object.keys(imapBlock.actions()).length).toBe(0);
  });

  test('should return correct triggers', () => {
    expect(Object.keys(imapBlock.triggers()).length).toBe(1);
    expect(imapBlock.triggers()).toMatchObject({
      new_email: {
        name: 'new_email',
      },
    });
  });
});
