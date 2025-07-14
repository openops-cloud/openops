import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { Extension } from '@uiw/react-codemirror';

const shellLang = StreamLanguage.define(shell);

export const getLanguageExtensionForCode = (language?: string): Extension[] => {
  if (!language) return [];

  if (language.includes('language-json')) return [json()];
  if (
    language.includes('language-javascript') ||
    language.includes('language-js')
  )
    return [javascript()];
  if (
    language.includes('language-typescript') ||
    language.includes('language-ts')
  )
    return [javascript({ typescript: true })];

  if (
    language.includes('language-bash') ||
    language.includes('language-sh') ||
    language.includes('language-shell')
  )
    return [shellLang];

  return [];
};
