import { SourceCode } from '@openops/shared';
import { MonacoLanguage } from './code-editor';

export const getLanguageExtensionForCode = (
  className?: string,
): MonacoLanguage | undefined => {
  if (!className) return 'json';

  if (className.includes('language-json')) return 'json';
  if (
    className.includes('language-javascript') ||
    className.includes('language-js')
  )
    return 'javascript';
  if (
    className.includes('language-typescript') ||
    className.includes('language-ts')
  )
    return 'typescript';
  if (className.includes('language-jsx')) return 'javascript';
  if (className.includes('language-tsx')) return 'typescript';
};

export const convertToString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('circular structure')
    ) {
      const seen = new WeakSet();
      return JSON.stringify(
        value,
        (_, val) => {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '';
            }
            seen.add(val);
          }
          return val;
        },
        2,
      );
    }
    return String(value);
  }
};

export const isSourceCodeObject = (value: unknown): value is SourceCode => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'packageJson' in value &&
    typeof (value as any).code === 'string' &&
    typeof (value as any).packageJson === 'string'
  );
};
