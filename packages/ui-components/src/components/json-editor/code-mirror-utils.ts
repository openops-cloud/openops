import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { SourceCode } from '@openops/shared';
import { Extension } from '@uiw/react-codemirror';

const shellLang = StreamLanguage.define(shell);

export const getLanguageExtensionForCode = (language?: string): Extension[] => {
  if (!language) return [];

  if (language.includes('json')) return [json()];
  if (language.includes('javascript') || language.includes('js'))
    return [javascript()];
  if (language.includes('typescript') || language.includes('ts'))
    return [javascript({ typescript: true })];

  if (
    language.includes('bash') ||
    language.includes('sh') ||
    language.includes('shell')
  )
    return [shellLang];

  return [];
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
