import { applyVariables, extractLanguageFromClassName } from '../utils';

describe('extractLanguageFromClassName', () => {
  it('should return undefined for undefined input', () => {
    expect(extractLanguageFromClassName(undefined)).toBeUndefined();
  });

  it('should return undefined for strings without language prefix', () => {
    expect(extractLanguageFromClassName('')).toBeUndefined();
    expect(extractLanguageFromClassName('class-name')).toBeUndefined();
    expect(extractLanguageFromClassName('prefix-language')).toBeUndefined();
  });

  it('should extract language from valid class names', () => {
    expect(extractLanguageFromClassName('language-javascript')).toBe(
      'javascript',
    );
    expect(extractLanguageFromClassName('some-class language-python')).toBe(
      'python',
    );
    expect(
      extractLanguageFromClassName('language-typescript other-class'),
    ).toBe('typescript');
  });

  it('should handle class names with spaces correctly', () => {
    expect(
      extractLanguageFromClassName('language-javascript some-other-class'),
    ).toBe('javascript');
    expect(
      extractLanguageFromClassName('first-class language-python last-class'),
    ).toBe('python');
  });

  it('should return undefined for empty language name', () => {
    expect(extractLanguageFromClassName('language-')).toBeUndefined();
    expect(
      extractLanguageFromClassName('language- other-class'),
    ).toBeUndefined();
  });
});

describe('applyVariables', () => {
  it('should replace <br> tags with newlines', () => {
    expect(applyVariables('Line 1<br>Line 2', {})).toBe('Line 1\nLine 2');
    expect(applyVariables('Multiple<br>line<br>breaks', {})).toBe(
      'Multiple\nline\nbreaks',
    );
  });

  it('should replace variables with their values', () => {
    const variables = { name: 'John', age: '30' };
    expect(applyVariables('Hello {{name}}!', variables)).toBe('Hello John!');
    expect(applyVariables('{{name}} is {{age}} years old.', variables)).toBe(
      'John is 30 years old.',
    );
  });

  it('should replace missing variables with empty strings', () => {
    const variables = { name: 'John' };
    expect(
      applyVariables('Hello {{name}}, your age is {{age}}.', variables),
    ).toBe('Hello John, your age is .');
  });

  it('should handle multiple variables and <br> tags together', () => {
    const variables = { name: 'John', job: 'developer' };
    expect(applyVariables('Name: {{name}}<br>Job: {{job}}', variables)).toBe(
      'Name: John\nJob: developer',
    );
  });

  it('should handle no variables to replace', () => {
    expect(applyVariables('Text without variables', {})).toBe(
      'Text without variables',
    );
  });

  it('should handle empty input string', () => {
    expect(applyVariables('', { name: 'John' })).toBe('');
  });
});
