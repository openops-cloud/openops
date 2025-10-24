import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { concat } from './lib/actions/concat';
import { find } from './lib/actions/find';
import { htmlToMarkdown } from './lib/actions/html-to-markdown';
import { markdownToHTML } from './lib/actions/markdown-to-html';
import { replace } from './lib/actions/replace';
import { split } from './lib/actions/split';
import { stripHtmlContent } from './lib/actions/strip-html';

export const textHelper = createBlock({
  displayName: 'Text Operations',
  description: 'Tools for text processing',
  auth: BlockAuth.None(),
  displayIcon: 'LetterText',
  authors: [
    'joeworkman',
    'kishanprmr',
    'MoShizzle',
    'AbdulTheActiveBlockr',
    'abuaboud',
  ],
  categories: [BlockCategory.CORE],
  actions: [
    concat,
    replace,
    split,
    find,
    markdownToHTML,
    htmlToMarkdown,
    stripHtmlContent,
  ],
  triggers: [],
});
