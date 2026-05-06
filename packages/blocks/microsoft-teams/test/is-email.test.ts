import { isEmail } from '../src/lib/common/get-or-create-user-chat';

describe('isEmail', () => {
  test('should return true for valid emails', () => {
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail('test.user@domain.co.uk')).toBe(true);
    expect(isEmail('name+tag@company.org')).toBe(true);
  });

  test('should return false for Teams thread chat IDs', () => {
    expect(isEmail('19:abc123def456@thread.v2')).toBe(false);
    expect(isEmail('19:meeting_xyz@thread.tacv2')).toBe(false);
    expect(isEmail('19:conversation@thread.skype')).toBe(false);
  });

  test('should return false for Teams chat IDs starting with 19:', () => {
    expect(isEmail('19:user-id-123@unid')).toBe(false);
    expect(isEmail('19:something@anything')).toBe(false);
  });

  test('should return false for invalid email formats', () => {
    expect(isEmail('user@nodot')).toBe(false);
    expect(isEmail('@example.com')).toBe(false);
    expect(isEmail('userexample.com')).toBe(false);
    expect(isEmail('user@')).toBe(false);
  });

  test('should return false for regular user IDs', () => {
    expect(isEmail('48d31887-5fad-4d73-a9f5-3c356e68a038')).toBe(false);
    expect(isEmail('user-id-123')).toBe(false);
  });

  test('should return false for empty or invalid input', () => {
    expect(isEmail('')).toBe(false);
    expect(isEmail('just-text')).toBe(false);
  });
});
