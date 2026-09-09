const translate = jest.fn((key: string) => `translated:${key}`);

jest.mock('i18next', () => ({
  t: (key: string) => translate(key),
}));

// Before i18next.init() runs, t() returns undefined. In production builds the
// bundler may evaluate this module before the app's i18n setup, so nothing in
// it may call t() at module scope. See OPS-4318.
describe('password-validation i18n timing', () => {
  beforeEach(() => {
    jest.resetModules();
    translate.mockClear();
  });

  it('does not call t() when the module is imported', async () => {
    await import('../src/lib/password-validation');

    expect(translate).not.toHaveBeenCalled();
  });

  it('translates rule labels when getPasswordRules() is called', async () => {
    const { getPasswordRules } = await import('../src/lib/password-validation');

    const labels = getPasswordRules().map((rule) => rule.label);

    expect(labels).toEqual([
      'translated:8-64 Characters',
      'translated:Special Character',
      'translated:Lowercase',
      'translated:Uppercase',
      'translated:Number',
    ]);
  });

  it('translates validation messages when a validator rejects a value', async () => {
    const { passwordValidation } =
      await import('../src/lib/password-validation');

    expect(passwordValidation.minLength('abc')).toBe(
      'translated:Password must be at least 8 characters long',
    );
    expect(passwordValidation.hasNumber('abcdefgh!A')).toBe(
      'translated:Password must contain at least one number',
    );
    expect(passwordValidation.hasNumber('abcdefgh!A1')).toBe(true);
  });
});
